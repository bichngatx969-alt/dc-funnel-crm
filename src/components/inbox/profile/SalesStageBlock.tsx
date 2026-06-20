import { ProfileBlock, BlockEmpty, BlockCta } from "./ProfileBlock";
import { InboxIcon } from "../icons";
import { ScoreBadge } from "@/components/ui";
import { formatVnd } from "@/components/money";
import { STAGE_OPTIONS, type ContactDetail } from "@/components/contacts/types";

const OPP_STATUS_LABEL: Record<string, string> = { OPEN: "Đang mở", WON: "Đã chốt", LOST: "Thất bại" };

export function SalesStageBlock({
  contact,
  onChangeStage,
}: {
  contact: ContactDetail | null;
  onChangeStage: (stage: string) => void;
}) {
  const opportunities = contact?.opportunities ?? [];
  const owner = contact?.owner;

  return (
    <ProfileBlock id="block-stage" title="Giai đoạn bán hàng" icon="star">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
          <span className="text-[12.5px] text-gray-500">Lead score</span>
          <ScoreBadge score={contact?.leadScore ?? 0} />
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] text-gray-400">Giai đoạn hiện tại</span>
          <select
            value={contact?.currentStage ?? "COLD"}
            onChange={(e) => onChangeStage(e.target.value)}
            disabled={!contact}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-800 focus:border-brand focus:outline-none disabled:opacity-60"
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[12.5px] text-gray-500">
            <InboxIcon name="userCheck" className="h-3.5 w-3.5" />
            Sale phụ trách
          </span>
          <span className={`text-[12.5px] ${owner ? "font-medium text-gray-700" : "italic text-gray-300"}`}>
            {owner?.name ?? owner?.email ?? "Chưa gán"}
          </span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-gray-500">Cơ hội (opportunity)</span>
            <BlockCta icon="target" label="Tạo cơ hội" href="/pipeline" />
          </div>
          {opportunities.length === 0 ? (
            <BlockEmpty text="Khách chưa có cơ hội nào." />
          ) : (
            <ul className="space-y-1.5">
              {opportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-gray-800">{o.title}</div>
                    <div className="truncate text-[11px] text-gray-400">
                      {o.pipeline?.name ? `${o.pipeline.name} · ` : ""}
                      {o.stage?.name ?? ""} · {OPP_STATUS_LABEL[o.status] ?? o.status}
                    </div>
                  </div>
                  <span className="shrink-0 text-[12.5px] font-bold text-brand-dark">{formatVnd(o.valueVnd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProfileBlock>
  );
}
