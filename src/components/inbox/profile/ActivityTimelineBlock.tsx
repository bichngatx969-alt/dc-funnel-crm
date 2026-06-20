import { ProfileBlock, BlockEmpty } from "./ProfileBlock";
import { SkeletonBar } from "../primitives";
import { InboxIcon, type InboxIconName } from "../icons";
import { fmtDateTime, type TimelineItem } from "@/components/contacts/types";

const TYPE_ICON: Record<TimelineItem["type"], InboxIconName> = {
  "note.created": "note",
  "conversation.activity": "person",
  "task.activity": "takeover",
  "opportunity.activity": "target",
};

function iconFor(type: TimelineItem["type"]): InboxIconName {
  return TYPE_ICON[type] ?? "clock";
}

export function ActivityTimelineBlock({ items }: { items: TimelineItem[] | null }) {
  return (
    <ProfileBlock id="block-activity" title="Hoạt động gần đây" icon="clock" collapsible defaultOpen>
      {items === null ? (
        <div className="space-y-2">
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-4 w-2/3" />
          <SkeletonBar className="h-4 w-1/2" />
        </div>
      ) : items.length === 0 ? (
        <BlockEmpty text="Chưa có hoạt động." />
      ) : (
        <ol className="space-y-2.5">
          {items.slice(0, 6).map((it) => (
            <li key={`${it.type}-${it.id}`} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <InboxIcon name={iconFor(it.type)} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-gray-700">{it.title}</span>
                  <span className="shrink-0 text-[10.5px] text-gray-400">{fmtDateTime(it.occurredAt)}</span>
                </div>
                {it.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">{it.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </ProfileBlock>
  );
}
