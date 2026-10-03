import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { createUser, findUserByEmail, findUserById } from "./db.js";

const secret = process.env.JWT_SECRET ?? (process.env.DATABASE_URL ? "" : "dev-only-secret-change-me");
if (!secret) throw new Error("JWT_SECRET must be set in production");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

function sign(userId: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: "30d" });
}

function readCredentials(body: unknown): { email: string; password: string } | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!EMAIL.test(email) || email.length > 254) return "Enter a valid email address";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 200) return "Password is too long";
  return { email, password };
}

const hits = new Map<string, { count: number; reset: number }>();
export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) hits.set(key, { count: 1, reset: now + 60_000 });
  else if (++entry.count > 15) {
    res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
    return;
  }
  next();
}

export async function signup(req: Request, res: Response): Promise<void> {
  const creds = readCredentials(req.body);
  if (typeof creds === "string") {
    res.status(400).json({ error: creds });
    return;
  }
  const id = randomUUID();
  const created = await createUser(id, creds.email, await bcrypt.hash(creds.password, 10));
  if (!created) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }
  res.status(201).json({ token: sign(id), user: { id, email: creds.email } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const creds = readCredentials(req.body);
  const user = typeof creds === "string" ? null : await findUserByEmail(creds.email);
  const ok = user && typeof creds !== "string" && (await bcrypt.compare(creds.password, user.passwordHash));
  if (!user || !ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json({ token: sign(user.id), user: { id: user.id, email: user.email } });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, secret) as { sub?: string };
    const user = payload.sub ? await findUserById(payload.sub) : null;
    if (!user) throw new Error("unknown user");
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Sign in required" });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = req.userId ? await findUserById(req.userId) : null;
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  res.json({ user });
}
