// Helper upload media dùng chung cho catalog UI (cover, gallery, ảnh variant).
// Dùng fetch trực tiếp vì apiSend ép Content-Type application/json (không hợp multipart).

export type MediaAsset = {
  id: string;
  url: string;
  altText: string | null;
};

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadMedia(file: File, altText?: string): Promise<MediaAsset> {
  const fd = new FormData();
  fd.append("file", file);
  if (altText) fd.append("altText", altText);
  const res = await fetch("/api/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { ok: boolean; data?: { media: MediaAsset }; error?: string };
  if (!res.ok || !json.ok || !json.data?.media) throw new Error(json.error || `Lỗi ${res.status}`);
  return json.data.media;
}
