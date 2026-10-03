"use client";

import { useState } from "react";
import type { Workspace } from "@/lib/types";
import { asString, asStringArray, formatDeadline } from "@/lib/format";

export default function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const f = workspace.fields;
  const deadline = asString(f.deadline);
  const status = asString(f.status) || "potential";
  const tasks = asStringArray(f.tasks);
  const stack = asStringArray(f.techStack);
  const resources = asStringArray(f.resources);
  const itemCount = workspace.items?.length ?? workspace.itemIds.length;
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const isHackathon = workspace.templateType === "hackathon";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span
            className={`font-mono text-[10px] tracking-[0.08em] uppercase ${
              isHackathon ? "text-accent" : "text-muted"
            }`}
          >
            {workspace.templateType}
          </span>
          <h3 className="font-serif text-[19px] leading-tight font-medium">{workspace.name}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[11px] whitespace-nowrap ${
            status === "in-progress" ? "bg-ink text-card" : "bg-[#efe8d6] text-ink-soft"
          }`}
        >
          {status}
        </span>
      </header>

      <div className="flex items-center gap-2 rounded-[10px] bg-paper px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="#8a8273" strokeWidth="1.6" />
          <path d="M12 7v5l3 2" stroke="#8a8273" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="font-mono text-[12.5px] text-ink-soft">
          {deadline ? formatDeadline(deadline) : "No deadline"}
        </span>
      </div>

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {tasks.map((task, i) => {
            const checked = done.has(i);
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(i)}
                    className="peer sr-only"
                  />
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-[5px] border-[1.6px] border-[#c9bfa8] peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 13l4 4 10-10" stroke="#fbf8f1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[13.5px] ${checked ? "text-muted line-through" : "text-ink"}`}>
                    {task}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {(stack.length > 0 || resources.length > 0 || itemCount > 0) && (
        <footer className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          {stack.map((s) => (
            <span key={s} className="rounded-full bg-paper px-2.5 py-1 font-mono text-[10.5px] text-ink-soft">
              {s}
            </span>
          ))}
          {resources.length > 0 && (
            <span className="rounded-full bg-paper px-2.5 py-1 font-mono text-[10.5px] text-ink-soft">
              {resources.length} resource{resources.length === 1 ? "" : "s"}
            </span>
          )}
          {itemCount > 0 && (
            <span className="rounded-full bg-paper px-2.5 py-1 font-mono text-[10.5px] text-ink-soft">
              {itemCount} captured
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
