"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { RuleFormModal } from "@/components/automation/RuleFormModal";
import { RunsList } from "@/components/automation/RunsList";
import {
  ACTION_LABEL,
  LOCKED_ACTIONS,
  LOCKED_ACTION_WARNING,
  RUN_STATUS_CLASS,
  RUN_STATUS_LABEL,
  TRIGGER_LABEL,
  fmtDateTime,
  parseJsonField,
  stringifyJson,
  type Rule,
  type Run,
} from "@/components/automation/types";

export function RuleDetailClient({ id }: { id: string }) {
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [payloadText, setPayloadText] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Run | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [runsKey, setRunsKey] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ rule: Rule }>(`/api/automation/rules/${id}`);
      setRule(data.rule);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được quy tắc");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function toggleActive() {
    if (!rule) return;
    const prev = rule.isActive;
    setRule({ ...rule, isActive: !prev });
    try {
      await apiSend<{ rule: Rule }>(`/api/automation/rules/${id}`, "PATCH", { isActive: !prev });
    } catch {
      setRule({ ...rule, isActive: prev });
    }
  }

  async function runTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    let payload: unknown;
    try {
      payload = parseJsonField(payloadText, "Dữ liệu test (JSON)");
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : "JSON không hợp lệ");
      setTesting(false);
      return;
    }
    try {
      const res = await apiSend<{ run: Run; dryRun: boolean }>(`/api/automation/rules/${id}/test`, "POST", {
        dryRun,
        ...(payload ? { payload } : {}),
      });
      setTestResult(res.run);
      setRunsKey((k) => k + 1); // refresh runs list
      load(); // cập nhật runCount/lastRunAt
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : "Không chạy thử được");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-xl border bg-white" />
        <div className="h-40 animate-pulse rounded-xl border bg-white" />
      </div>
    );
  }

  if (!rule) {
    return (
      <EmptyState
        title="Không tải được quy tắc"
        description={error ?? undefined}
        action={
          <div className="flex gap-2">
            <button onClick={load} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Thử lại</button>
            <Link href="/automation" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Về danh sách</Link>
          </div>
        }
      />
    );
  }

  const r = rule;
  const locked = LOCKED_ACTIONS.includes(r.actionType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/automation" className="text-sm text-gray-500 hover:text-gray-800">‹ Tự động hóa</Link>
        <button onClick={() => setEditing(true)} className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Sửa</button>
      </div>

      {/* Thông tin rule */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{r.name}</h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
            {r.isActive ? "Đang bật" : "Đã tắt"}
          </span>
        </div>
        {r.description && <p className="mt-1 text-sm text-gray-600">{r.description}</p>}
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Info label="Khi nào" value={TRIGGER_LABEL[r.triggerType] ?? r.triggerType} />
          <Info label="Hành động" value={ACTION_LABEL[r.actionType] ?? r.actionType} />
          <Info label="Đã chạy" value={`${r.runCount} lần`} />
          <Info label="Gần nhất" value={fmtDateTime(r.lastRunAt) || "—"} />
          <Info label="Người tạo" value={r.createdBy?.name ?? r.createdBy?.email ?? "—"} />
        </div>
        {locked && <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠️ {LOCKED_ACTION_WARNING}</p>}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={toggleActive} className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            {r.isActive ? "Tắt quy tắc" : "Bật quy tắc"}
          </button>
        </div>
        {(Boolean(r.conditionsJson) || Boolean(r.actionConfigJson)) && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {r.conditionsJson ? <JsonBlock label="Điều kiện" value={r.conditionsJson} /> : <div />}
            {r.actionConfigJson ? <JsonBlock label="Cấu hình hành động" value={r.actionConfigJson} /> : <div />}
          </div>
        )}
      </div>

      {/* Chạy thử */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold">Chạy thử (dry-run)</div>
        <p className="mt-1 text-xs text-gray-500">
          Dry-run kiểm tra điều kiện & hành động nhưng KHÔNG tạo dữ liệu thật. Mỗi lần chạy vẫn ghi 1 dòng lịch sử để đối chiếu.
        </p>
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder='Dữ liệu test (JSON, tuỳ chọn) — VD: {"customerId": "...", "hasPhone": true}'
          className="mt-2 w-full rounded border px-2 py-2 font-mono text-xs focus:border-brand focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="h-4 w-4" />
            <span>Dry-run (không tạo dữ liệu thật)</span>
          </label>
          <button onClick={runTest} disabled={testing} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {testing ? "Đang chạy…" : "Chạy thử"}
          </button>
        </div>
        {testError && <p className="mt-2 text-xs text-rose-600">{testError}</p>}
        {testResult && (
          <div className="mt-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RUN_STATUS_CLASS[testResult.status] ?? "bg-gray-100 text-gray-700"}`}>
                {RUN_STATUS_LABEL[testResult.status] ?? testResult.status}
              </span>
              <span className="text-xs text-gray-400">{fmtDateTime(testResult.createdAt)}</span>
            </div>
            {testResult.error && <p className="mt-1 text-xs text-rose-600">Lỗi: {testResult.error}</p>}
            {testResult.outputJson != null && (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                {stringifyJson(testResult.outputJson)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Lịch sử chạy của rule */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">Lịch sử chạy của quy tắc này</div>
        <RunsList key={runsKey} ruleId={id} />
      </div>

      {editing && (
        <RuleFormModal
          mode="edit"
          rule={r}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setRule(saved);
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-gray-800">{value}</span>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-gray-500">{label}</div>
      <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-gray-700">{stringifyJson(value)}</pre>
    </div>
  );
}
