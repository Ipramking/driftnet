"use client";

import { useEffect, useState } from "react";
import CaptureBar from "@/components/CaptureBar";
import InboxList from "@/components/InboxList";
import WorkspaceCard from "@/components/WorkspaceCard";
import { ApiError, capture, listItems, listWorkspaces } from "@/lib/api";
import { asString, parseDeadline } from "@/lib/format";
import { clearSession } from "@/lib/session";
import type { CapturedItem, Workspace } from "@/lib/types";

function byDeadline(a: Workspace, b: Workspace): number {
  const da = parseDeadline(asString(a.fields.deadline))?.getTime() ?? Infinity;
  const db = parseDeadline(asString(b.fields.deadline))?.getTime() ?? Infinity;
  return da - db;
}

async function load(): Promise<{ workspaces: Workspace[]; items: CapturedItem[] }> {
  const [ws, its] = await Promise.all([listWorkspaces(), listItems()]);
  return { workspaces: [...ws].sort(byDeadline), items: its.filter((i) => !i.workspaceId) };
}

export default function Dashboard({ email }: { email: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setWorkspaces(data.workspaces);
        setItems(data.items);
        setOffline(false);
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) setOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCapture(text: string): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    try {
      const result = await capture(text);
      setNotice({
        kind: "ok",
        text: result.workspace ? `Filed into: ${result.workspace.name}` : `Saved as a loose ${result.item.type}`,
      });
      const data = await load();
      setWorkspaces(data.workspaces);
      setItems(data.items);
      return true;
    } catch (err) {
      const signedOut = err instanceof ApiError && err.status === 401;
      setNotice({
        kind: "error",
        text: signedOut ? "Your session expired. Sign in again." : "Could not reach the agent. Your text is still in the box.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-12 px-5 pt-14 pb-24 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3.5">
          <h1 className="font-serif text-[30px] font-semibold tracking-tight">Driftnet</h1>
          <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">catch · structure · act</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className={`size-[7px] rounded-full ${offline ? "bg-[#8b3a3a]" : "bg-accent"}`} aria-hidden />
            <span className="font-mono text-xs text-muted">
              {offline ? "agent offline" : `${workspaces.length} open workspace${workspaces.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-[200px] truncate font-mono text-xs text-ink-soft" title={email}>
              {email}
            </span>
            <button
              type="button"
              onClick={clearSession}
              className="min-h-9 cursor-pointer rounded-lg border border-line px-3 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <CaptureBar busy={busy} onSubmit={handleCapture} />
        <div aria-live="polite" className="min-h-5 px-2 font-mono text-xs">
          {notice && <span className={notice.kind === "ok" ? "text-ink-soft" : "text-[#8b3a3a]"}>{notice.text}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Workspaces</h2>
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">sorted by deadline</span>
        </div>
        {workspaces.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
            No workspaces yet. Paste a hackathon announcement above and watch one appear.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {workspaces.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Inbox</h2>
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">not filed yet</span>
        </div>
        <InboxList items={items} />
      </section>
    </main>
  );
}
