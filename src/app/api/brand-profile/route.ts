import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const INDUSTRIES = ["FASHION", "STUDIO", "SALON", "WEDDING", "SERVICE", "OTHER"];

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const profile = await getOrCreateBrandProfile();
  return jsonOk(profile);
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const profile = await getOrCreateBrandProfile();
  const industry = INDUSTRIES.includes(body.industry) ? body.industry : "OTHER";

  const updated = await prisma.brandProfile.update({
    where: { id: profile.id },
    data: {
      brandName: String(body.brandName ?? "").trim() || profile.brandName,
      industry,
      description: nullable(body.description),
      defaultTone: nullable(body.defaultTone),
      logoUrl: nullable(body.logoUrl),
      primaryColor: nullable(body.primaryColor),
      productServices: nullable(body.productServices),
      salesPolicy: nullable(body.salesPolicy),
      contactInfo: nullable(body.contactInfo),
    },
  });

  return jsonOk(updated);
}

async function getOrCreateBrandProfile() {
  const existing = await prisma.brandProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.brandProfile.create({
    data: {
      brandName: "HICHAOS",
      industry: "FASHION",
      defaultTone: "trẻ trung, nữ tính, thân thiện, tư vấn nhanh, có định hướng chốt đơn mềm",
    },
  });
}

function nullable(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
