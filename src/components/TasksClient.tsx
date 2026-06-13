"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { StageBadge } from "@/components/ui";

type Task = {
  id: string;
  type: string;
  title: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  customer: { id: string; name: string | null; psid: string; phone: string | null; currentStage: string } | null;
  assignedTo: { id: string; name: string | null } | null;
};

const FILTERS = [
  { k: "TODO", l: "Cần làm" },
  { k: "DONE", l: "Đã xong" },
  { k: "CANCELLED", l: "Đã hủy" },
  { k: "all", l: "Tất cả" },
];

export function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("TODO");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Task[]>(`/api/tasks?status=${filter}`);
      setTasks(data);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(t: Task, status: string) {
    await apiSend(`/api/tasks/${t.id}`, "PATCH", { status });
    await load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Tasks follow-up</h1>
      <p className="mb-4 text-sm text-gray-500">
        Bot tự tạo task khi khách để lại SĐT hoặc trở thành HOT. Sale theo dõi và đánh dấu hoàn thành ở đây.
      </p>

      {err && <div className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <div className="mb-4 flex gap-1 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`rounded px-3 py-1 ${
              filter === f.k ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Khách</th>
              <th className="px-3 py-2">Loại</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Không có task nào.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">
                  <div className={`font-medium ${t.status === "DONE" ? "text-gray-400 line-through" : ""}`}>
                    {t.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleString("vi-VN")}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {t.customer ? (
                    <div>
                      <div>{t.customer.name ?? `Khách ${t.customer.psid.slice(-6)}`}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {t.customer.phone && <span>{t.customer.phone}</span>}
                        <StageBadge stage={t.customer.currentStage} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{t.type}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      t.status === "DONE"
                        ? "bg-emerald-100 text-emerald-700"
                        : t.status === "CANCELLED"
                        ? "bg-gray-200 text-gray-500"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {t.status !== "DONE" && (
                    <button
                      onClick={() => setStatus(t, "DONE")}
                      className="mr-2 text-xs text-emerald-600 hover:underline"
                    >
                      Hoàn thành
                    </button>
                  )}
                  {t.status === "TODO" && (
                    <button
                      onClick={() => setStatus(t, "CANCELLED")}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Hủy
                    </button>
                  )}
                  {t.status !== "TODO" && (
                    <button
                      onClick={() => setStatus(t, "TODO")}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Mở lại
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
