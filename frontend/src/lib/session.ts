import { useMemo, useSyncExternalStore } from "react";

const KEY = "driftnet.session";
const listeners = new Set<() => void>();

export interface Session {
  token: string;
  email: string;
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Session>;
    return s.token && s.email ? { token: s.token, email: s.email } : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return parse(readRaw())?.token ?? null;
}

export function setSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage unavailable: the user stays signed out
  }
  notify();
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
  notify();
}

export function useSession(): { loading: boolean; session: Session | null } {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw() ?? "",
    () => "loading",
  );
  return useMemo(
    () => (raw === "loading" ? { loading: true, session: null } : { loading: false, session: parse(raw || null) }),
    [raw],
  );
}
