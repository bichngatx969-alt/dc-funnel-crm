"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Icon } from "@/components/layout/icons";

type ContentPost = {
  id: string;
  message: string | null;
  permalink: string | null;
  createdAt: string;
  commentCount: number;
  phoneComments: number;
  reach: number | null;
};

export function ContentClient() {
  const [date, setDate] = useState("");
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = date ? `?date=${date}` : "";
      const res = await apiGet<{ items: ContentPost[]; contentInsightsStatus: string }>(`/api/content/posts${qs}`);
      setPosts(res.items ?? []);
      setStatus(res.contentInsightsStatus ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Không tải được nội dung.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);
  const totalPhone = posts.reduce((s, p) => s + p.phoneComments, 0);

  return (
    <div className="space-y-4">
      <div className="dc-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
        <label className="flex items-center gap-2 text-[13px] text-gray-600">
          <span className="font-medium">Ngày</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </label>
        {status === "PARTIAL" && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">PARTIAL — chưa có reach từ Meta</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Bài đăng" value={posts.length} />
        <Stat label="Comment" value={totalComments} />
        <Stat label="Comment có SĐT" value={totalPhone} tone={totalPhone > 0 ? "good" : undefined} />
      </div>

      {error && (
        <div className="dc-card rounded-2xl p-4 text-[13px] text-rose-500">
          {error} <button type="button" onClick={() => void load()} className="font-semibold underline">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="dc-card flex flex-col items-center gap-2 rounded-2xl px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
            <Icon name="fanpage" className="h-6 w-6" />
          </span>
          <p className="text-[13px] font-medium text-gray-600">Không có bài đăng trong ngày này</p>
          <p className="max-w-[22rem] text-[12px] text-gray-400">DCOS đọc bài đăng fanpage đã đồng bộ nội bộ. Nếu fanpage có đăng mà chưa hiện, cần đồng bộ bài đăng từ Graph.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="dc-card rounded-2xl p-3">
              <p className="line-clamp-3 text-[13px] text-gray-700">{p.message || "(không có nội dung text)"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span>{p.commentCount} comment</span>
                {p.phoneComments > 0 && <span className="font-semibold text-emerald-600">{p.phoneComments} có SĐT</span>}
                <span className="text-gray-400">Reach: chưa có</span>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    Xem bài
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" }) {
  return (
    <div className="dc-card rounded-2xl p-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === "good" ? "text-emerald-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
