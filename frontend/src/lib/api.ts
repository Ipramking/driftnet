import type { CaptureResult, CapturedItem, Workspace } from "./types";
import { clearSession, getToken } from "./session";

const BASE = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function failure(res: Response): Promise<ApiError> {
  let message = `Agent responded ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // keep the generic message
  }
  return new ApiError(res.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    if (res.status === 401 && getToken() && !path.startsWith("/api/auth/")) clearSession();
    throw await failure(res);
  }
  return res.json() as Promise<T>;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string };
}

export function signUp(email: string, password: string): Promise<AuthResult> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function signIn(email: string, password: string): Promise<AuthResult> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
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
    headers: { "Content-Type": audio.type || "audio/webm", ...authHeaders() },
    body: audio,
  });
  if (!res.ok) throw await failure(res);
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
