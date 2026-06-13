import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { enrollCustomerToSequence } from "@/lib/email/automation";

export const dynamic = "force-dynamic";

// Enroll 1 khách vào sequence thủ công.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId ?? "");
  if (!customerId) return jsonError("Thiếu customerId");

  const result = await enrollCustomerToSequence(customerId, id);
  return jsonOk(result);
}
