import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../templates");

export interface Template {
  type: string;
  description: string;
  fields: Record<string, string>;
}

export const templates: Template[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), "utf8")) as Template);

export const templateTypes = templates.map((t) => t.type);
