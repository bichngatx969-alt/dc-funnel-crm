import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api";
import { readLocalMediaObject } from "@/lib/storage/media-storage";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { key: parts } = await params;
  const key = parts.join("/");

  if (!key.startsWith(`${workspaceId}/`)) return jsonError("Không tìm thấy media", 404);

  try {
    const bytes = await readLocalMediaObject(key);
    return new NextResponse(bytes, {
      headers: {
        "content-type": contentTypeForKey(key),
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return jsonError("Không tìm thấy media", 404);
  }
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
