import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) return jsonError("Vui lòng nhập email và mật khẩu");

  let user = await prisma.user.findUnique({ where: { email } });

  // Bootstrap tài khoản admin từ env nếu DB chưa có user nào khớp.
  if (!user && env.adminEmail && email === env.adminEmail.trim().toLowerCase()) {
    if (password === env.adminPassword) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(env.adminPassword),
          role: "ADMIN",
          name: env.adminName,
        },
      });
    }
  }

  if (!user) return jsonError("Email hoặc mật khẩu không đúng", 401);

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return jsonError("Email hoặc mật khẩu không đúng", 401);

  await setSessionCookie(user.id);
  return jsonOk({ id: user.id, email: user.email, name: user.name, role: user.role });
}
