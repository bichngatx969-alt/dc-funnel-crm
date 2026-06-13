// Phát hiện & validate email trong text.
const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i;

export function extractEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
