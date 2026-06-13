import crypto from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export function encryptToken(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptToken(cipherText: string): string {
  const key = getEncryptionKey();
  const [version, ivText, tagText, encryptedText] = cipherText.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("Token mã hóa không đúng định dạng.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 10) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function getEncryptionKey(): Buffer {
  const secret = env.tokenEncryptionSecret.trim();
  if (secret.length < 32) {
    throw new Error("Thiếu TOKEN_ENCRYPTION_SECRET hoặc secret quá ngắn. Hãy dùng chuỗi ngẫu nhiên tối thiểu 32 ký tự.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}
