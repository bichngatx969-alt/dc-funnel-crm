import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Gắn/xóa tag. Hỗ trợ: { tags: string[] } (thay toàn bộ) hoặc { add } / { remove }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return jsonError("Không tìm thấy khách", 404);

  let tags = customer.tags;
  if (Array.isArray(body.tags)) {
    tags = Array.from(new Set(body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)));
  } else {
    if (body.add) tags = Array.from(new Set([...tags, String(body.add).trim()]));
    if (body.remove) tags = tags.filter((t) => t !== String(body.remove));
  }

  const updated = await prisma.customer.update({ where: { id }, data: { tags } });
  return jsonOk(updated);
}
