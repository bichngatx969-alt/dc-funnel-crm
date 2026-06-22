"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Đăng nhập thất bại");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold text-brand">DCOS</h1>
          <p className="text-sm text-gray-500">D.C Operating System</p>
          <p className="mt-1 text-xs text-gray-400">Hệ điều hành cá nhân cho người kinh doanh hiện đại.</p>
        </div>

        {err && (
          <div className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="admin@dcgroup.vn"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Dùng ADMIN_EMAIL / ADMIN_PASSWORD trong file .env
        </p>
      </form>
    </div>
  );
}
