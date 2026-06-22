import { mediaAssetSelect } from "@/lib/catalog";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { normalizeNullableText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import {
  getAllowedImageTypes,
  getImageDimensions,
  getMaxUploadBytes,
  isAllowedImageMimeType,
  MediaStorageError,
  normalizeUploadFileName,
  uploadMediaFile,
} from "@/lib/storage/media-storage";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_WINDOW_MS = 60_000;
const UPLOAD_MAX_PER_WINDOW = 10;
const uploadBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  if (!allowUpload(`${workspaceId}:${user.id}`)) {
    return jsonError("Upload quá nhanh, vui lòng thử lại sau ít phút", 429);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Upload phải dùng multipart/form-data");

  const file = form.get("file");
  if (!isUploadFile(file)) return jsonError("Thiếu file ảnh");

  const mimeType = file.type.toLowerCase();
  if (!isAllowedImageMimeType(mimeType)) {
    return jsonError(`Chỉ hỗ trợ: ${getAllowedImageTypes().join(", ")}`, 415);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > getMaxUploadBytes()) return jsonError("File ảnh vượt quá dung lượng cho phép", 413);

  const fileName = normalizeUploadFileName(file.name);
  const dimensions = getImageDimensions(bytes, mimeType);

  try {
    const stored = await uploadMediaFile({ workspaceId, bytes, fileName, mimeType });
    const media = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        url: stored.url,
        fileName,
        mimeType,
        sizeBytes: bytes.length,
        width: dimensions.width,
        height: dimensions.height,
        altText: normalizeNullableText(form.get("altText")),
        source: "UPLOAD",
      },
      select: mediaAssetSelect,
    });

    return jsonOk({ media }, 201);
  } catch (error) {
    if (error instanceof MediaStorageError) return jsonError(error.message, error.status);
    return jsonError("Upload ảnh thất bại", 500);
  }
}

function allowUpload(key: string) {
  const now = Date.now();
  const bucket = uploadBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    uploadBuckets.set(key, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    return true;
  }
  if (bucket.count >= UPLOAD_MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function" &&
      "name" in value &&
      "type" in value
  );
}
