// Helper fetch JSON dùng ở client components.
type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.ok) throw new Error(json.error || `Lỗi ${res.status}`);
  return json.data as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.ok) throw new Error(json.error || `Lỗi ${res.status}`);
  return json.data as T;
}
