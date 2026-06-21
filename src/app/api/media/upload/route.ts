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

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

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
