import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { publicPageSelect } from "@/lib/facebook/facebook-integration-service";
import { encryptToken } from "@/lib/security/token-encryption";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const pages = await prisma.facebookPage.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: publicPageSelect,
  });
  return jsonOk(pages);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const body = await req.json().catch(() => ({}));
  const pageId = String(body.pageId ?? "").trim();
  const pageName = String(body.pageName ?? "").trim();
  if (!pageId || !pageName) return jsonError("Vui lòng nhập pageId và pageName");
  const existingPage = await prisma.facebookPage.findUnique({
    where: { pageId },
    select: { workspaceId: true },
  });
  if (existingPage?.workspaceId && existingPage.workspaceId !== workspaceId) {
    return jsonError("Fanpage này đã thuộc workspace khác", 409);
  }
  const token = nullable(body.pageAccessTokenEncrypted);
  const encryptedToken = token ? encryptToken(token) : null;

  const page = await prisma.facebookPage.upsert({
    where: { pageId },
    update: {
      workspaceId,
      pageName,
      pageAccessTokenEncrypted: encryptedToken,
      botEnabled: body.botEnabled === undefined ? false : Boolean(body.botEnabled),
      status: body.status === "DISCONNECTED" || body.status === "ERROR" ? body.status : "CONNECTED",
    },
    create: {
      workspaceId,
      pageId,
      pageName,
      pageAccessTokenEncrypted: encryptedToken,
      botEnabled: body.botEnabled === undefined ? false : Boolean(body.botEnabled),
      status: body.status === "DISCONNECTED" || body.status === "ERROR" ? body.status : "CONNECTED",
    },
    select: publicPageSelect,
  });

  return jsonOk(page);
}

function nullable(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
