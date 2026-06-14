import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth";

type ApiRole = SessionUser["role"];

// Helper trả lỗi chuẩn cho API routes.
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

// Bảo vệ API route: trả về user nếu đã đăng nhập, ngược lại null.
export async function requireApiUser() {
  const user = await getSessionUser();
  return user;
}

export async function requireRole(roles: ApiRole | ApiRole[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const user = await requireApiUser();
  if (!user) {
    return { ok: false as const, response: jsonError("Chưa đăng nhập", 401) };
  }
  if (!allowedRoles.includes(user.role)) {
    return { ok: false as const, response: jsonError("Không đủ quyền", 403) };
  }
  return { ok: true as const, user };
}

export function requireAdmin() {
  return requireRole(["ADMIN", "AGENCY_ADMIN", "OWNER"]);
}
