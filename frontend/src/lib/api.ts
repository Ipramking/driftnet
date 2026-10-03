import type { CaptureResult, CapturedItem, Workspace } from "./types";

const BASE = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Agent responded ${res.status}`);
  return res.json() as Promise<T>;
}

export function capture(text: string): Promise<CaptureResult> {
  return request("/api/capture", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const data = await request<{ workspaces: Workspace[] }>("/api/workspaces");
  return data.workspaces;
}

export async function listItems(): Promise<CapturedItem[]> {
  const data = await request<{ items: CapturedItem[] }>("/api/items");
  return data.items;
}
