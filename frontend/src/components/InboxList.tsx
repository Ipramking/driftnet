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
  return (
    asString(item.fields.summary) ||
    asString(item.fields.whyItMatters) ||
    item.title ||
    item.rawInput
  );
}

export default function InboxList({ items }: { items: CapturedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
        Nothing loose. Anything you capture that does not belong to a workspace lands here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col rounded-2xl border border-line bg-card">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-4 border-b border-line-soft px-[22px] py-[18px] last:border-b-0"
        >
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] uppercase ${CHIP[item.type] ?? CHIP.note}`}
          >
            {item.type}
          </span>
          <span className="min-w-0 flex-1 text-sm">{summary(item)}</span>
          <span className="shrink-0 font-mono text-[11.5px] text-muted">{timeAgo(item.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
