"use client";

import { useEffect, useRef } from "react";
import { formatDeadline, timeAgo } from "@/lib/format";

export interface Detail {
  kicker: string;
  title: string;
  fields: Record<string, unknown>;
  captures: { text: string; at: string }[];
}

const SKIP = new Set(["name", "title"]);
const DATE_KEYS = new Set(["deadline", "due"]);

function label(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function Value({ k, v }: { k: string; v: unknown }) {
  if (Array.isArray(v)) {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        {v.map((x, i) => (
          <li key={i}>{String(x)}</li>
        ))}
      </ul>
    );
  }
  const s = String(v);
  if (/^https?:\/\/\S+$/.test(s)) {
    return (
      <a href={s} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-accent underline">
        {s}
      </a>
    );
  }
  return <p className="text-sm text-ink">{DATE_KEYS.has(k) ? formatDeadline(s) : s}</p>;
}

export default function DetailDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  const entries = Object.entries(detail.fields).filter(([k, v]) => !SKIP.has(k) && !isEmpty(v));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[85vh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.08em] text-accent uppercase">{detail.kicker}</span>
            <h2 className="font-serif text-[22px] leading-tight font-medium">{detail.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-soft hover:border-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {entries.length > 0 && (
          <dl className="flex flex-col gap-4">
            {entries.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">{label(k)}</dt>
                <dd>
                  <Value k={k} v={v} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {detail.captures.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-line pt-5">
            <h3 className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
              {detail.captures.length === 1 ? "Original capture" : "Original captures"}
            </h3>
            {detail.captures.map((c, i) => (
              <figure key={i} className="flex flex-col gap-1.5 rounded-xl bg-paper p-4">
                <blockquote className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-soft">
                  {c.text}
                </blockquote>
                <figcaption className="font-mono text-[11px] text-muted">{timeAgo(c.at)}</figcaption>
              </figure>
            ))}
          </section>
        )}
      </div>
    </dialog>
  );
}
