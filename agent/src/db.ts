import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(here, "../data/driftnet.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    template_type TEXT NOT NULL,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    raw_input TEXT NOT NULL,
    fields TEXT NOT NULL,
    workspace_id TEXT
  );
`);

export type Fields = Record<string, unknown>;

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

function toItem(r: Record<string, unknown>): ItemRow {
  return {
    id: r.id as string,
    type: r.type as string,
    title: r.title as string,
    createdAt: r.created_at as string,
    rawInput: r.raw_input as string,
    fields: JSON.parse(r.fields as string) as Fields,
    workspaceId: (r.workspace_id as string | null) ?? null,
  };
}

export function insertItem(item: ItemRow): void {
  db.prepare(
    "INSERT INTO items (id, type, title, created_at, raw_input, fields, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(item.id, item.type, item.title, item.createdAt, item.rawInput, JSON.stringify(item.fields), item.workspaceId);
}

export function listItems(): ItemRow[] {
  return db.prepare("SELECT * FROM items ORDER BY created_at DESC").all().map(toItem);
}

export function insertWorkspace(w: { id: string; templateType: string; name: string; fields: Fields }): void {
  db.prepare("INSERT INTO workspaces (id, template_type, name, fields, created_at) VALUES (?, ?, ?, ?, ?)").run(
    w.id,
    w.templateType,
    w.name,
    JSON.stringify(w.fields),
    new Date().toISOString(),
  );
}

export function updateWorkspaceFields(id: string, fields: Fields): void {
  db.prepare("UPDATE workspaces SET fields = ? WHERE id = ?").run(JSON.stringify(fields), id);
}

export function listWorkspaces(): WorkspaceRow[] {
  const items = listItems();
  return db
    .prepare("SELECT * FROM workspaces ORDER BY created_at DESC")
    .all()
    .map((r) => {
      const mine = items.filter((i) => i.workspaceId === r.id);
      return {
        id: r.id as string,
        templateType: r.template_type as string,
        name: r.name as string,
        fields: JSON.parse(r.fields as string) as Fields,
        itemIds: mine.map((i) => i.id),
        items: mine,
      };
    });
}

export function getWorkspace(id: string): WorkspaceRow | null {
  return listWorkspaces().find((w) => w.id === id) ?? null;
}
