"use client";

import { useState } from "react";
import DetailDialog, { type Detail } from "@/components/DetailDialog";
import type { CapturedItem, ItemType } from "@/lib/types";
import { asString, timeAgo } from "@/lib/format";

const CHIP: Record<ItemType, string> = {
  idea: "bg-[#e4eee9] text-[#2f6f5e]",
  resource: "bg-[#e7ebf5] text-[#3b5ba6]",
  task: "bg-[#f2e3e0] text-[#8b3a3a]",
  hackathon: "bg-[#f3e6d6] text-accent",
  note: "bg-[#efe8d6] text-ink-soft",
};

function summary(item: CapturedItem): string {
  return asString(item.fields.summary) || asString(item.fields.whyItMatters) || item.title || item.rawInput;
}

function toDetail(item: CapturedItem): Detail {
  return {
    kicker: item.type,
    title: item.title || summary(item),
    fields: item.fields,
    captures: [{ text: item.rawInput, at: item.createdAt }],
  };
}

export default function InboxList({ items }: { items: CapturedItem[] }) {
  const [open, setOpen] = useState<Detail | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
        Nothing loose. Anything you capture that does not belong to a workspace lands here.
      </p>
    );
  }
  return (
    <>
      <ul className="flex flex-col rounded-2xl border border-line bg-card">
        {items.map((item) => (
          <li key={item.id} className="border-b border-line-soft last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(toDetail(item))}
              className="flex min-h-14 w-full cursor-pointer items-center gap-4 px-[22px] py-[18px] text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper/60"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] uppercase ${CHIP[item.type] ?? CHIP.note}`}
              >
                {item.type}
              </span>
              <span className="min-w-0 flex-1 text-sm">{summary(item)}</span>
              <span className="shrink-0 font-mono text-[11.5px] text-muted">{timeAgo(item.createdAt)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {open && <DetailDialog detail={open} onClose={() => setOpen(null)} />}
    </>
  );
}
