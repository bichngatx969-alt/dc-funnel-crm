import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { publicPageSelect } from "@/lib/facebook/facebook-integration-service";
import { encryptToken } from "@/lib/security/token-encryption";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const pages = await prisma.facebookPage.findMany({
    orderBy: { createdAt: "asc" },
    select: publicPageSelect,
  });
  return jsonOk(pages);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const pageId = String(body.pageId ?? "").trim();
  const pageName = String(body.pageName ?? "").trim();
  if (!pageId || !pageName) return jsonError("Vui lòng nhập pageId và pageName");
  const token = nullable(body.pageAccessTokenEncrypted);
  const encryptedToken = token ? encryptToken(token) : null;

  const page = await prisma.facebookPage.upsert({
    where: { pageId },
    update: {
      pageName,
      pageAccessTokenEncrypted: encryptedToken,
      botEnabled: body.botEnabled === undefined ? false : Boolean(body.botEnabled),
      status: body.status === "DISCONNECTED" || body.status === "ERROR" ? body.status : "CONNECTED",
    },
    create: {
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
