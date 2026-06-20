"use client";

import { useState } from "react";
import { ProfileBlock, BlockEmpty } from "./ProfileBlock";
import { InboxIcon } from "../icons";
import { fmtDate, type ContactTask } from "@/components/contacts/types";

const TASK_STATUS_LABEL: Record<string, string> = { TODO: "Cần làm", DONE: "Xong", CANCELLED: "Huỷ" };

export function FollowUpTaskBlock({
  tasks,
  onCreateTask,
}: {
  tasks: ContactTask[];
  onCreateTask: (title: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t) return;
    onCreateTask(t);
    setValue("");
  }

  const open = tasks.filter((t) => t.status === "TODO");
  const shown = (open.length > 0 ? open : tasks).slice(0, 4);

  return (
    <ProfileBlock id="block-tasks" title="Việc cần làm" icon="takeover">
      <div className="mb-2 space-y-1.5">
        {tasks.length === 0 ? (
          <BlockEmpty text="Chưa có task follow-up." />
        ) : (
          shown.map((t) => {
            const overdue = t.status === "TODO" && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <div className={`truncate text-[13px] ${t.status === "DONE" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {t.title}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <span>{TASK_STATUS_LABEL[t.status] ?? t.status}</span>
                    {t.dueAt && (
                      <>
                        <InboxIcon name="calendar" className="h-3 w-3" />
                        <span>{fmtDate(t.dueAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                {overdue && (
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                    Quá hạn
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 focus-within:border-brand">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Tạo task follow-up…"
          className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
        />
        <button
          onClick={submit}
          className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-gray-500 hover:bg-gray-200"
          aria-label="Tạo task"
        >
          +
        </button>
      </div>
    </ProfileBlock>
  );
}
