import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export type Fields = Record<string, unknown>;

interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

async function connect(): Promise<Queryable> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const external = /\.render\.com/.test(url);
    return new pg.Pool({ connectionString: url, ssl: external ? { rejectUnauthorized: false } : undefined });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../data/pglite");
  mkdirSync(dir, { recursive: true });
  return new PGlite(dir) as unknown as Queryable;
}

const dbPromise: Promise<Queryable> = connect().then(async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_type TEXT NOT NULL,
      name TEXT NOT NULL,
      fields JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      raw_input TEXT NOT NULL,
      fields JSONB NOT NULL,
      workspace_id TEXT
    )`);
  await db.query("CREATE INDEX IF NOT EXISTS workspaces_user_idx ON workspaces (user_id)");
  await db.query("CREATE INDEX IF NOT EXISTS items_user_idx ON items (user_id)");
  return db;
});

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
}

export interface ItemRow {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  rawInput: string;
  fields: Fields;
  workspaceId: string | null;
}

export interface WorkspaceRow {
  id: string;
  templateType: string;
  name: string;
  fields: Fields;
  itemIds: string[];
  items: ItemRow[];
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

function toItem(r: Record<string, unknown>): ItemRow {
  return {
    id: r.id as string,
    type: r.type as string,
    title: r.title as string,
    createdAt: iso(r.created_at),
    rawInput: r.raw_input as string,
    fields: r.fields as Fields,
    workspaceId: (r.workspace_id as string | null) ?? null,
  };
}

export async function createUser(id: string, email: string, passwordHash: string): Promise<boolean> {
  const db = await dbPromise;
  const res = await db.query(
    "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
    [id, email, passwordHash],
  );
  return res.rows.length > 0;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = await dbPromise;
  const res = await db.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const r = res.rows[0];
  return r ? { id: r.id as string, email: r.email as string, passwordHash: r.password_hash as string } : null;
}

export async function findUserById(id: string): Promise<{ id: string; email: string } | null> {
  const db = await dbPromise;
  const res = await db.query("SELECT id, email FROM users WHERE id = $1", [id]);
  const r = res.rows[0];
  return r ? { id: r.id as string, email: r.email as string } : null;
}

export async function insertItem(userId: string, item: ItemRow): Promise<void> {
  const db = await dbPromise;
  await db.query(
    "INSERT INTO items (id, user_id, type, title, created_at, raw_input, fields, workspace_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [item.id, userId, item.type, item.title, item.createdAt, item.rawInput, JSON.stringify(item.fields), item.workspaceId],
  );
}

export async function listItems(userId: string): Promise<ItemRow[]> {
  const db = await dbPromise;
  const res = await db.query("SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return res.rows.map(toItem);
}

export async function insertWorkspace(
  userId: string,
  w: { id: string; templateType: string; name: string; fields: Fields },
): Promise<void> {
  const db = await dbPromise;
  await db.query("INSERT INTO workspaces (id, user_id, template_type, name, fields) VALUES ($1, $2, $3, $4, $5)", [
    w.id,
    userId,
    w.templateType,
    w.name,
    JSON.stringify(w.fields),
  ]);
}

export async function updateWorkspaceFields(userId: string, id: string, fields: Fields): Promise<void> {
  const db = await dbPromise;
  await db.query("UPDATE workspaces SET fields = $1 WHERE id = $2 AND user_id = $3", [JSON.stringify(fields), id, userId]);
}

export async function listWorkspaces(userId: string): Promise<WorkspaceRow[]> {
  const db = await dbPromise;
  const [items, res] = await Promise.all([
    listItems(userId),
    db.query("SELECT * FROM workspaces WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
  ]);
  return res.rows.map((r) => {
    const mine = items.filter((i) => i.workspaceId === r.id);
    return {
      id: r.id as string,
      templateType: r.template_type as string,
      name: r.name as string,
      fields: r.fields as Fields,
      itemIds: mine.map((i) => i.id),
      items: mine,
    };
  });
}

export async function getWorkspace(userId: string, id: string): Promise<WorkspaceRow | null> {
  return (await listWorkspaces(userId)).find((w) => w.id === id) ?? null;
}

export const dbReady: Promise<void> = dbPromise.then(() => undefined);
