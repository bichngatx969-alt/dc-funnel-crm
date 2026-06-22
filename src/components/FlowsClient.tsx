"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type Page = { pageId: string; pageName: string };

type Step = {
  id: string;
  key: string;
  messageText: string;
  quickRepliesJson: any;
  quickRepliesText: string;
  scoreDelta: number;
  stageToSet: string | null;
  tagsToAdd: string[];
};

type Flow = {
  id: string;
  pageId: string | null;
  facebookPage?: Page | null;
  name: string;
  triggerType: string;
  triggerValue: string | null;
  isActive: boolean;
  steps: Step[];
};

export function FlowsClient() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function load() {
    try {
      const [flowData, pageData] = await Promise.all([
        apiGet<any[]>("/api/flows"),
        apiGet<Page[]>("/api/facebook-pages"),
      ]);
      setPages(pageData);
      setFlows(
        flowData.map((f) => ({
          ...f,
          steps: f.steps.map((s: any) => ({
            ...s,
            quickRepliesText: s.quickRepliesJson ? JSON.stringify(s.quickRepliesJson, null, 2) : "",
          })),
        }))
      );
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateStep(flowId: string, stepId: string, patch: Partial<Step>) {
    setFlows((prev) =>
      prev.map((f) =>
        f.id !== flowId
          ? f
          : { ...f, steps: f.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
      )
    );
  }

  function updateFlow(flowId: string, patch: Partial<Flow>) {
    setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, ...patch } : f)));
  }

  async function saveFlow(flow: Flow) {
    setErr(null);
    setSavedId(null);
    try {
      await apiSend(`/api/flows/${flow.id}`, "PATCH", {
        name: flow.name,
        isActive: flow.isActive,
        pageId: flow.pageId,
        steps: flow.steps.map((s) => ({
          id: s.id,
          key: s.key,
          messageText: s.messageText,
          quickRepliesJson: s.quickRepliesText.trim() === "" ? null : s.quickRepliesText,
          scoreDelta: s.scoreDelta,
          stageToSet: s.stageToSet,
          tagsToAdd: s.tagsToAdd,
        })),
      });
      setSavedId(flow.id);
      await load();
      setTimeout(() => setSavedId(null), 2500);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Flows</h1>
      <p className="mb-4 text-sm text-gray-500">
        Flow của Space hiện tại. Chọn áp dụng cho toàn Space hoặc riêng một Fanpage.
      </p>

      {err && <div className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      {flows.length === 0 && (
        <p className="text-sm text-gray-400">Chưa có flow nào. Hãy chạy <code>npm run prisma:seed</code>.</p>
      )}

      <div className="space-y-6">
        {flows.map((flow) => (
          <div key={flow.id} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <input
                  value={flow.name}
                  onChange={(e) => updateFlow(flow.id, { name: e.target.value })}
                  className="rounded border-b border-transparent px-1 text-lg font-semibold hover:border-gray-300 focus:border-brand focus:outline-none"
                />
                <div className="text-xs text-gray-500">
                  vertical: <code>{flow.triggerValue}</code> · trigger: {flow.triggerType}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs">
                  <span className="mb-1 block text-gray-500">Áp dụng</span>
                  <select
                    value={flow.pageId ?? ""}
                    onChange={(e) => updateFlow(flow.id, { pageId: e.target.value || null })}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="">Toàn Space</option>
                    {pages.map((p) => (
                      <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={flow.isActive}
                    onChange={(e) => updateFlow(flow.id, { isActive: e.target.checked })}
                  />
                  Active
                </label>
                {savedId === flow.id && <span className="text-xs text-emerald-600">Đã lưu</span>}
                <button
                  onClick={() => saveFlow(flow)}
                  className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Lưu flow
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {flow.steps.map((s) => (
                <div key={s.id} className="rounded-lg border bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-white">{s.key}</code>
                    <span className="text-xs text-gray-500">
                      +{s.scoreDelta} điểm{s.tagsToAdd.length ? ` · tags: ${s.tagsToAdd.join(", ")}` : ""}
                      {s.stageToSet ? ` · stage: ${s.stageToSet}` : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-500">Message text</label>
                      <textarea
                        rows={3}
                        value={s.messageText}
                        onChange={(e) => updateStep(flow.id, s.id, { messageText: e.target.value })}
                        className="w-full rounded border px-2 py-1 text-sm focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-500">
                        Quick replies (JSON array hoặc trống)
                      </label>
                      <textarea
                        rows={3}
                        value={s.quickRepliesText}
                        onChange={(e) => updateStep(flow.id, s.id, { quickRepliesText: e.target.value })}
                        placeholder='[{"title":"Xem combo","payload":"NEED_COMBO"}]'
                        className="w-full rounded border px-2 py-1 font-mono text-xs focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
