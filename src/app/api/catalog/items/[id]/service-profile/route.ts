import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { requireBookableCatalogItem, serviceProfileData, serviceProfileSelect } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requireBookableCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, 404);

  const profile = await prisma.serviceProfile.findUnique({
    where: { catalogItemId: id },
    select: serviceProfileSelect,
  });

  return jsonOk({
    profile,
    defaults: {
      bookingEnabled: false,
      defaultDurationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      depositRequired: false,
      depositVnd: 0,
      locationMode: "OFFLINE",
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requireBookableCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, 404);

  const body = await req.json().catch(() => ({}));
  const data = serviceProfileData(body);

  const profile = await prisma.serviceProfile.upsert({
    where: { catalogItemId: id },
    create: {
      workspaceId,
      catalogItemId: id,
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    },
    update: data,
    select: serviceProfileSelect,
  });

  return jsonOk({ profile });
}
