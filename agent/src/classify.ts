import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "./model.js";
import { templates, templateTypes } from "./templates.js";
import type { Fields, WorkspaceRow } from "./db.js";

const Result = z.object({
  template: z.string(),
  title: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
  workspaceMatch: z.string().nullable().optional(),
});
export type Classification = z.infer<typeof Result>;

const instructions =
  "You are the filing brain of Driftnet, a capture tool. You receive one messy capture (pasted text, a link, or a transcribed voice note). " +
  "Decide what it is, pull out structured fields, and reply with ONE JSON object and nothing else: no prose, no markdown fences.";

let agent: Agent | null = null;
function getAgent(): Agent {
  agent ??= new Agent({ id: "driftnet-classifier", name: "driftnet-classifier", instructions, model: getModel() });
  return agent;
}

function buildPrompt(text: string, workspaces: WorkspaceRow[]): string {
  const schemas = templates
    .map((t) => `- "${t.type}": ${t.description}\n  fields: ${JSON.stringify(t.fields)}`)
    .join("\n");
  const open = workspaces.length
    ? workspaces
        .map((w) => `- id=${w.id} | ${w.templateType} | ${w.name} | deadline=${String(w.fields.deadline ?? "none")}`)
        .join("\n")
    : "(none yet)";
  return `Today is ${new Date().toISOString()}.

Available templates (pick the single best fit; use "note" with a "summary" field if nothing fits):
${schemas}

Existing workspaces (if this capture belongs to one of them, return its id as workspaceMatch, otherwise null):
${open}

Rules:
- "template" must be one of: ${[...templateTypes, "note"].join(", ")}.
- "fields" must follow the chosen template's field names exactly. Use arrays for array fields and plain strings otherwise. Use "" for unknown strings and [] for unknown arrays.
- Dates and deadlines: output ISO 8601 in UTC (for example 2026-10-05T06:59:00Z). Resolve relative dates like "next Friday" from today's date. If you cannot resolve it, keep the original phrase.
- For a hackathon, "tasks" must be 4 to 6 short concrete starter tasks in the order someone would do them, and "status" is one of: potential, in-progress, submitted.
- "title" is a short human label (the event name, the idea in a few words, or the resource title).
- Never invent facts that are not in the capture.

Reply with exactly this shape:
{"template":"...","title":"...","fields":{...},"workspaceMatch":null}

Capture:
"""
${text}
"""`;
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("model returned no JSON");
  let depth = 0;
  let inString = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(raw.slice(start, i + 1));
  }
  throw new Error("model returned unbalanced JSON");
}

function normalize(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (obj.fields === undefined || obj.fields === null) {
    const { template, title, workspaceMatch, ...rest } = obj;
    return { template, title: title ?? rest.name ?? rest.summary ?? "Untitled", workspaceMatch, fields: rest };
  }
  return obj;
}

async function generateOnce(prompt: string): Promise<Classification> {
  const res = await getAgent().generate(prompt, {
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
  });
  return Result.parse(normalize(extractJson(res.text)));
}

export async function classify(text: string, workspaces: WorkspaceRow[]): Promise<Classification> {
  const prompt = buildPrompt(text, workspaces);
  let parsed: Classification;
  try {
    parsed = await generateOnce(prompt);
  } catch {
    await new Promise((r) => setTimeout(r, 800));
    parsed = await generateOnce(prompt);
  }
  if (!templateTypes.includes(parsed.template)) parsed.template = "note";
  return parsed;
}

export function fallbackClassification(text: string): Classification {
  const fields: Fields = { summary: text.slice(0, 280), category: "", relatedTo: "", nextAction: "" };
  return { template: "idea", title: text.slice(0, 60), fields, workspaceMatch: null };
}
