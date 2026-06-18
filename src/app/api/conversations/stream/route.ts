import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { syncRecentFacebookInbox } from "@/lib/facebook/inbox-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAM_POLL_MS = 1500;
const GRAPH_SYNC_MS = 5000;
const PING_MS = 15000;

type InboxSnapshot = {
  conversationVersion: string | null;
  messageVersion: string | null;
  messageCount: number;
};

function sameSnapshot(a: InboxSnapshot | null, b: InboxSnapshot): boolean {
  return (
    Boolean(a) &&
    a?.conversationVersion === b.conversationVersion &&
    a?.messageVersion === b.messageVersion &&
    a?.messageCount === b.messageCount
  );
}

async function getInboxSnapshot(params: {
  workspaceId: string;
  pageId: string | null;
  conversationId: string | null;
}): Promise<InboxSnapshot> {
  const conversationWhere = {
    workspaceId: params.workspaceId,
    ...(params.pageId && params.pageId !== "all" ? { pageId: params.pageId } : {}),
  };
  const messageWhere = params.conversationId
    ? { workspaceId: params.workspaceId, conversationId: params.conversationId }
    : null;

  const [latestConversation, latestMessage, messageCount] = await Promise.all([
    prisma.conversation.findFirst({
      where: conversationWhere,
      orderBy: { lastMessageAt: "desc" },
      select: { id: true, lastMessageAt: true },
    }),
    messageWhere
      ? prisma.message.findFirst({
          where: messageWhere,
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true },
        })
      : Promise.resolve(null),
    messageWhere ? prisma.message.count({ where: messageWhere }) : Promise.resolve(0),
  ]);

  return {
    conversationVersion: latestConversation
      ? `${latestConversation.id}:${latestConversation.lastMessageAt.toISOString()}`
      : null,
    messageVersion: latestMessage ? `${latestMessage.id}:${latestMessage.createdAt.toISOString()}` : null,
    messageCount,
  };
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");
  const conversationId = searchParams.get("conversationId");
  const encoder = new TextEncoder();

  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSnapshot: InboxSnapshot | null = null;
  let lastGraphSyncAt = 0;
  let lastPingAt = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          closed = true;
        }
      };

      const cleanup = () => {
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Stream may already be closed by the client.
        }
      };

      const tick = async () => {
        if (closed) return;
        const now = Date.now();

        if (now - lastGraphSyncAt >= GRAPH_SYNC_MS) {
          lastGraphSyncAt = now;
          syncRecentFacebookInbox({
            workspaceId,
            pageId,
            limitPages: pageId && pageId !== "all" ? 1 : 2,
            limitConversations: 3,
            limitMessages: 5,
          }).catch((error) => {
            console.warn(
              "[FB SYNC] Bỏ qua sync inbox realtime:",
              error instanceof Error ? error.message : String(error)
            );
          });
        }

        try {
          const snapshot = await getInboxSnapshot({ workspaceId, pageId, conversationId });
          if (!sameSnapshot(lastSnapshot, snapshot)) {
            lastSnapshot = snapshot;
            send("inbox-update", {
              ...snapshot,
              conversationId,
              now: new Date().toISOString(),
            });
          } else if (now - lastPingAt >= PING_MS) {
            lastPingAt = now;
            send("ping", { now: new Date().toISOString() });
          }
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "Stream error" });
        }
      };

      req.signal.addEventListener("abort", cleanup, { once: true });
      send("ready", { ok: true, now: new Date().toISOString() });
      void tick();
      timer = setInterval(() => void tick(), STREAM_POLL_MS);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
