import crypto from "crypto";

// Xác thực chữ ký X-Hub-Signature-256 mà Meta gửi kèm webhook POST.
// header dạng: "sha256=<hex>"
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;
  const [algo, sig] = signatureHeader.split("=");
  if (algo !== "sha256" || !sig) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
