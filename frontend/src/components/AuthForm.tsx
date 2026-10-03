"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await (mode === "signin" ? signIn : signUp)(email.trim(), password);
      setSession({ token: result.token, email: result.user.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center gap-10 px-5 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-[40px] leading-none font-semibold tracking-tight">Driftnet</h1>
        <p className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">catch · structure · act</p>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Drop anything messy in one box. Driftnet files it into a workspace you can pick up on any device.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-6">
        <div className="flex rounded-xl bg-paper p-1" role="tablist" aria-label="Account">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 cursor-pointer rounded-lg py-2.5 text-sm transition-colors ${
                mode === m ? "bg-card font-medium text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-xl border border-line bg-paper px-4 text-base text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Password</span>
          <input
            type="password"
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-xl border border-line bg-paper px-4 text-base text-ink outline-none focus:border-accent"
          />
          {signup && <span className="text-xs text-muted">At least 8 characters.</span>}
        </label>

        <div aria-live="polite" className="min-h-4 font-mono text-xs text-[#8b3a3a]">
          {error}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-ink text-[15px] font-medium text-card transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <span className="size-4 animate-spin rounded-full border-2 border-card/40 border-t-card" />
          ) : signup ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </main>
  );
}
