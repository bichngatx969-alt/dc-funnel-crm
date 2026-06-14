"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { CreateOpportunityModal } from "@/components/pipeline/CreateOpportunityModal";
import type {
  OppStatus,
  PipelineDetail,
  PipelineListItem,
  PipelineTemplate,
} from "@/components/pipeline/types";

type PipelinesPayload = { items: PipelineListItem[]; templates: PipelineTemplate[] };
type DetailPayload = { pipeline: PipelineDetail };

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-72 w-72 shrink-0 animate-pulse rounded-xl border bg-gray-50" />
      ))}
    </div>
  );
}

export function PipelineClient({ canManage }: { canManage: boolean }) {
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PipelineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStageId, setCreateStageId] = useState<string | null>(null);
  const [creatingPipeline, setCreatingPipeline] = useState(false);

  const loadPipelines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PipelinesPayload>("/api/pipelines");
      setPipelines(data.items ?? []);
      setTemplates(data.templates ?? []);
      const def = data.items?.find((p) => p.isDefault) ?? data.items?.[0] ?? null;
      setCurrentId((prev) => prev ?? def?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const data = await apiGet<DetailPayload>(`/api/pipelines/${id}`);
      setDetail(data.pipeline);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu pipeline");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (currentId) loadDetail(currentId);
  }, [currentId, loadDetail]);

  async function handleMoveStage(oppId: string, stageId: string) {
    if (!detail) return;
    const prev = detail;
    setDetail({
      ...detail,
      opportunities: detail.opportunities.map((o) => (o.id === oppId ? { ...o, stageId } : o)),
    });
    setNotice(null);
    try {
      await apiSend(`/api/opportunities/${oppId}/stage`, "PATCH", { stageId });
    } catch (e: unknown) {
      setDetail(prev);
      setNotice(e instanceof Error ? e.message : "Không chuyển được giai đoạn");
    }
  }

  async function handleSetStatus(oppId: string, status: OppStatus) {
    if (!detail) return;
    const opp = detail.opportunities.find((o) => o.id === oppId);
    if (!opp) return;
    const prev = detail;
    setDetail({
      ...detail,
      opportunities: detail.opportunities.map((o) => (o.id === oppId ? { ...o, status } : o)),
    });
    setNotice(null);
    try {
      await apiSend(`/api/opportunities/${oppId}/stage`, "PATCH", { stageId: opp.stageId, status });
    } catch (e: unknown) {
      setDetail(prev);
      setNotice(e instanceof Error ? e.message : "Không cập nhật được trạng thái");
    }
  }

  async function handleCreated() {
    setShowCreate(false);
    setCreateStageId(null);
    if (currentId) await loadDetail(currentId);
  }

  async function createFromTemplate(templateKey: string) {
    setCreatingPipeline(true);
    setError(null);
    try {
      const res = await apiSend<{ pipeline: PipelineListItem }>("/api/pipelines", "POST", {
        template: templateKey,
        isDefault: true,
      });
      await loadPipelines();
      if (res?.pipeline?.id) setCurrentId(res.pipeline.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tạo được pipeline");
    } finally {
      setCreatingPipeline(false);
    }
  }

  if (loading) return <BoardSkeleton />;

  // Chưa có pipeline nào (hiếm gặp vì GET tự tạo default) -> chọn mẫu theo ngành.
  if (pipelines.length === 0) {
    return (
      <EmptyState
        icon="🗂️"
        title="Bắt đầu quản lý khách theo pipeline"
        description="Chọn mẫu pipeline theo ngành để dựng các giai đoạn bán hàng phù hợp."
        action={
          canManage ? (
            <div className="flex flex-wrap justify-center gap-2">
              {templates.map((t) => (
                <button
                  key={t.key}
                  disabled={creatingPipeline}
                  onClick={() => createFromTemplate(t.key)}
                  className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Liên hệ quản trị viên để tạo pipeline.</span>
          )
        }
      />
    );
  }

  const current = pipelines.find((p) => p.id === currentId) ?? pipelines[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {pipelines.length > 1 ? (
            <select
              value={currentId ?? ""}
              onChange={(e) => setCurrentId(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="text-lg font-semibold">{current?.name}</h2>
          )}
          {detailLoading && <span className="text-xs text-gray-400">Đang tải…</span>}
        </div>
        <button
          onClick={() => {
            setCreateStageId(null);
            setShowCreate(true);
          }}
          className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Tạo cơ hội
        </button>
      </div>

      {notice && (
        <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <button
            onClick={() => currentId && loadDetail(currentId)}
            className="shrink-0 rounded border border-rose-300 px-2 py-1 text-xs hover:bg-rose-100"
          >
            Thử lại
          </button>
        </div>
      )}

      {detail ? (
        <PipelineBoard
          detail={detail}
          onMoveStage={handleMoveStage}
          onSetStatus={handleSetStatus}
          onAddInStage={(stageId) => {
            setCreateStageId(stageId);
            setShowCreate(true);
          }}
        />
      ) : (
        !detailLoading && <p className="text-sm text-gray-400">Không có dữ liệu pipeline.</p>
      )}

      {showCreate && detail && (
        <CreateOpportunityModal
          pipelineId={detail.id}
          pipelineName={detail.name}
          stages={detail.stages}
          defaultStageId={createStageId}
          onClose={() => {
            setShowCreate(false);
            setCreateStageId(null);
          }}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
