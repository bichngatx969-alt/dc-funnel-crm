import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type MediaUploadInput = {
  workspaceId: string;
  bytes: Buffer;
  fileName: string;
  mimeType: string;
};

export type StoredMediaObject = {
  key: string;
  url: string;
  provider: "local" | "r2";
};

export type ImageDimensions = {
  width: number | null;
  height: number | null;
};

export function getAllowedImageTypes(): readonly string[] {
  return ALLOWED_IMAGE_TYPES;
}

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return ALLOWED_IMAGE_TYPES.includes(value as AllowedImageMimeType);
}

export function getMaxUploadBytes(): number {
  return env.mediaMaxUploadMb * 1024 * 1024;
}

export async function uploadMediaFile(input: MediaUploadInput): Promise<StoredMediaObject> {
  const mimeType = input.mimeType.toLowerCase();
  if (!isAllowedImageMimeType(mimeType)) {
    throw new MediaStorageError("UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
  }
  if (input.bytes.length <= 0) {
    throw new MediaStorageError("EMPTY_FILE", "File ảnh đang trống.");
  }
  if (input.bytes.length > getMaxUploadBytes()) {
    throw new MediaStorageError("FILE_TOO_LARGE", `File ảnh vượt quá ${env.mediaMaxUploadMb}MB.`);
  }

  const key = buildObjectKey(input.workspaceId, input.fileName, mimeType);
  const provider = normalizeProvider();
  if (provider === "r2") {
    return uploadToR2(key, input.bytes, mimeType);
  }

  return uploadToLocal(key, input.bytes);
}

export async function deleteMediaObject(input: { key: string }) {
  const provider = normalizeProvider();
  if (provider === "r2") {
    const client = getR2Client();
    await client.send(new DeleteObjectCommand({ Bucket: requireR2Bucket(), Key: input.key }));
    return;
  }

  const filePath = getLocalObjectPath(input.key);
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export function getPublicUrl(input: { key: string }): string {
  const provider = normalizeProvider();
  if (provider === "r2") {
    const baseUrl = env.r2PublicBaseUrl.trim().replace(/\/+$/, "");
    if (!baseUrl) {
      throw new MediaStorageError("R2_PUBLIC_URL_MISSING", "Thiếu R2_PUBLIC_BASE_URL.");
    }
    return `${baseUrl}/${input.key}`;
  }
  return `/api/media/local/${encodeKeyPath(input.key)}`;
}

export async function readLocalMediaObject(key: string) {
  if (!isSafeObjectKey(key)) {
    throw new MediaStorageError("INVALID_MEDIA_KEY", "Media key không hợp lệ.");
  }
  const filePath = getLocalObjectPath(key);
  return readFile(filePath);
}

export function getImageDimensions(bytes: Buffer, mimeType: string): ImageDimensions {
  if (mimeType === "image/png") return getPngDimensions(bytes);
  if (mimeType === "image/jpeg") return getJpegDimensions(bytes);
  if (mimeType === "image/webp") return getWebpDimensions(bytes);
  return { width: null, height: null };
}

export function normalizeUploadFileName(value: string): string {
  const baseName = path.basename(value || "upload").replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "");
  return baseName.slice(0, 120) || "upload";
}

export class MediaStorageError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

async function uploadToR2(key: string, bytes: Buffer, mimeType: string): Promise<StoredMediaObject> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: requireR2Bucket(),
      Key: key,
      Body: bytes,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return { key, url: getPublicUrl({ key }), provider: "r2" };
}

async function uploadToLocal(key: string, bytes: Buffer): Promise<StoredMediaObject> {
  const filePath = getLocalObjectPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return { key, url: getPublicUrl({ key }), provider: "local" };
}

function normalizeProvider(): "local" | "r2" {
  return env.mediaStorageProvider === "r2" || env.mediaStorageProvider === "s3" ? "r2" : "local";
}

function getR2Client() {
  const accountId = env.r2AccountId.trim();
  const accessKeyId = env.r2AccessKeyId.trim();
  const secretAccessKey = env.r2SecretAccessKey.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new MediaStorageError("R2_CONFIG_MISSING", "Thiếu cấu hình R2/S3-compatible cho upload ảnh.", 503);
  }
  return new S3Client({
    region: env.r2Region,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function requireR2Bucket() {
  const bucket = env.r2Bucket.trim();
  if (!bucket) {
    throw new MediaStorageError("R2_BUCKET_MISSING", "Thiếu R2_BUCKET.", 503);
  }
  return bucket;
}

function buildObjectKey(workspaceId: string, fileName: string, mimeType: string): string {
  const safeWorkspaceId = workspaceId.replace(/[^a-zA-Z0-9_-]+/g, "");
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const extension = extensionForMimeType(mimeType);
  const original = normalizeUploadFileName(fileName).replace(/\.[^.]+$/, "");
  return `${safeWorkspaceId}/${yyyy}/${mm}/${randomUUID()}-${original}${extension}`;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function getLocalObjectPath(key: string) {
  if (!isSafeObjectKey(key)) {
    throw new MediaStorageError("INVALID_MEDIA_KEY", "Media key không hợp lệ.");
  }
  return path.join(getLocalMediaRoot(), key);
}

function getLocalMediaRoot() {
  return env.mediaLocalDir.trim() || path.join(process.cwd(), ".data", "media");
}

function encodeKeyPath(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function isSafeObjectKey(key: string) {
  return Boolean(key && !key.includes("..") && !path.isAbsolute(key) && /^[a-zA-Z0-9/_\-.]+$/.test(key));
}

function getPngDimensions(bytes: Buffer): ImageDimensions {
  if (bytes.length < 24) return { width: null, height: null };
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return { width: null, height: null };
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function getJpegDimensions(bytes: Buffer): ImageDimensions {
  let offset = 2;
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return { width: null, height: null };
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (isJpegStartOfFrame(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return { width: null, height: null };
}

function isJpegStartOfFrame(marker: number) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    ![0xc4, 0xc8, 0xcc].includes(marker)
  );
}

function getWebpDimensions(bytes: Buffer): ImageDimensions {
  if (bytes.length < 30 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
    return { width: null, height: null };
  }
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && bytes.length >= 30) {
    const width = 1 + bytes.readUIntLE(24, 3);
    const height = 1 + bytes.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: null, height: null };
}
