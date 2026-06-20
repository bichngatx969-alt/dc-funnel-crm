"use client";

import { useState } from "react";
import { ProfileBlock } from "./ProfileBlock";
import { Tag } from "@/components/ui";

export function TagsBlock({
  tags,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t) return;
    onAddTag(t);
    setValue("");
  }

  return (
    <ProfileBlock id="block-tags" title="Phân loại (tags)" icon="tag" collapsible defaultOpen>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-[12.5px] italic text-gray-300">Chưa phân loại</span>
        ) : (
          tags.map((t) => <Tag key={t} label={t} onRemove={() => onRemoveTag(t)} />)
        )}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 focus-within:border-brand">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Thêm nhãn: nhu cầu, size, nhóm khách…"
          className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
        />
        <button
          onClick={submit}
          className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-gray-500 hover:bg-gray-200"
          aria-label="Thêm nhãn"
        >
          +
        </button>
      </div>
    </ProfileBlock>
  );
}
