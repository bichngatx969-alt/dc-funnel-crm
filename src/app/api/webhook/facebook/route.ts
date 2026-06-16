import { env } from "@/lib/env";
import { handleFacebookFeedChange } from "@/lib/facebook/comments";
import { verifySignature } from "@/lib/facebook/verify";
import { handleMessagingEvent } from "@/lib/funnel/intake";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ----------------------------------------------------------------
// GET /api/webhook/facebook
// Meta verify webhook: trả lại hub.challenge nếu verify_token khớp.
// ----------------------------------------------------------------
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.metaVerifyToken && challenge) {
    console.log("[WEBHOOK] Verify thành công.");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[WEBHOOK] Verify thất bại (mode/token không khớp).");
  return new Response("Forbidden", { status: 403 });
}

// ----------------------------------------------------------------
// POST /api/webhook/facebook
// Nhận messaging event. Luôn trả 200 nhanh để Meta không retry dồn dập.
// ----------------------------------------------------------------
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  // Xác thực chữ ký nếu có cấu hình META_APP_SECRET.
  if (env.metaAppSecret) {
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifySignature(raw, signature, env.metaAppSecret)) {
      console.warn("[WEBHOOK] Chữ ký X-Hub-Signature-256 không hợp lệ.");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Xử lý trong try/catch, luôn trả 200 (trừ lỗi xác thực ở trên).
  try {
    if (body?.object === "page" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const pageId = entry?.id ? String(entry.id) : null;
        const page = pageId
          ? await prisma.facebookPage.findUnique({ where: { pageId } })
          : null;
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        for (const change of changes) {
          const eventType = change?.field ? `feed:${change.field}` : "feed:unknown";
          const log = await prisma.facebookWebhookLog.create({
            data: {
              pageId,
              eventType,
              payloadJson: change as object,
              processingStatus: "RECEIVED",
            },
          });

          if (!page) {
            await markWebhookLog(log.id, "IGNORED", "Fanpage chưa được kết nối trong CRM.");
            continue;
          }
          if (page.status !== "CONNECTED" && page.status !== "WEBHOOK_NOT_SUBSCRIBED") {
            await markWebhookLog(log.id, "IGNORED", `Fanpage status hiện tại: ${page.status}.`);
            continue;
          }

          try {
            await handleFacebookFeedChange(pageId, change);
            await markWebhookLog(log.id, "PROCESSED");
          } catch (err) {
            console.error("[WEBHOOK] Lỗi xử lý 1 feed/comment event:", err);
            await markWebhookLog(log.id, "FAILED", err instanceof Error ? err.message : String(err));
          }
        }

        const events = Array.isArray(entry.messaging) ? entry.messaging : [];
        for (const event of events) {
          const eventType = event.message
            ? "message"
            : event.postback
            ? "postback"
            : event.delivery
            ? "delivery"
            : event.read
            ? "read"
            : "unknown";
          const log = await prisma.facebookWebhookLog.create({
            data: {
              pageId,
              eventType,
              payloadJson: event as object,
              processingStatus: "RECEIVED",
            },
          });

          if (!page) {
            await markWebhookLog(log.id, "IGNORED", "Fanpage chưa được kết nối trong CRM.");
            continue;
          }
          if (page.status !== "CONNECTED" && page.status !== "WEBHOOK_NOT_SUBSCRIBED") {
            await markWebhookLog(log.id, "IGNORED", `Fanpage status hiện tại: ${page.status}.`);
            continue;
          }

          try {
            await handleMessagingEvent(event);
            await markWebhookLog(log.id, "PROCESSED");
          } catch (err) {
            console.error("[WEBHOOK] Lỗi xử lý 1 event:", err);
            await markWebhookLog(log.id, "FAILED", err instanceof Error ? err.message : String(err));
          }
        }
      }
    } else {
      console.log("[WEBHOOK] Bỏ qua payload không phải 'page':", body?.object);
    }
  } catch (err) {
    console.error("[WEBHOOK] Lỗi tổng khi xử lý webhook:", err);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

async function markWebhookLog(
  id: string,
  processingStatus: "PROCESSED" | "FAILED" | "IGNORED",
  errorMessage?: string
) {
  await prisma.facebookWebhookLog.update({
    where: { id },
    data: { processingStatus, errorMessage: errorMessage ?? null },
  });
}
