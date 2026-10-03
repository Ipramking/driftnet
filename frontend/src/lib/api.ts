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

export async function transcribeAvailable(): Promise<boolean> {
  try {
    const data = await request<{ transcribe: boolean }>("/api/health");
    return data.transcribe;
  } catch {
    return false;
  }
}

export async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch(`${BASE}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": audio.type || "audio/webm" },
    body: audio,
  });
  if (!res.ok) throw new Error(`Transcription responded ${res.status}`);
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
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
