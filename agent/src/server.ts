import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { authRateLimit, login, me, requireAuth, signup } from "./auth.js";
import { classify, fallbackClassification, type Classification } from "./classify.js";
import {
  getWorkspace,
  insertItem,
  insertWorkspace,
  listItems,
  listWorkspaces,
  updateWorkspaceFields,
  type Fields,
  type ItemRow,
} from "./db.js";
import { modelConfigured, modelInfo } from "./model.js";
import { dbReady } from "./db.js";
import { transcribeEnabled, transcribeWithElevenLabs } from "./transcribe.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const WORKSPACE_TEMPLATES = new Set(["hackathon"]);

function mergeFields(base: Fields, extra: Fields): Fields {
  const out: Fields = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (Array.isArray(v)) {
      const prev = Array.isArray(out[k]) ? (out[k] as unknown[]) : [];
      out[k] = [...new Set([...prev, ...v])];
    } else if (v !== "" && v != null && (out[k] === "" || out[k] == null)) {
      out[k] = v;
    }
  }
  return out;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: modelInfo(), modelConfigured: modelConfigured(), transcribe: transcribeEnabled() });
});

app.post("/api/auth/signup", authRateLimit, signup);
app.post("/api/auth/login", authRateLimit, login);
app.get("/api/auth/me", requireAuth, me);

app.post("/api/transcribe", requireAuth, express.raw({ type: () => true, limit: "25mb" }), async (req, res) => {
  if (!transcribeEnabled()) return res.status(501).json({ error: "Transcription is not configured" });
  const audio = req.body as Buffer;
  if (!Buffer.isBuffer(audio) || audio.length === 0) return res.status(400).json({ error: "No audio received" });
  try {
    const transcript = await transcribeWithElevenLabs(audio, req.header("content-type") ?? "audio/webm");
    res.json({ transcript });
  } catch (err) {
    console.error("transcribe failed:", err);
    res.status(502).json({ error: "Transcription failed" });
  }
});

app.post("/api/capture", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 20_000) return res.status(413).json({ error: "Capture is too long" });

  let result: Classification;
  try {
    result = await classify(text, await listWorkspaces(userId));
  } catch (err) {
    console.error("classify failed, filing as idea:", err);
    result = fallbackClassification(text);
  }

  let workspaceId: string | null = null;
  const matched = result.workspaceMatch ? await getWorkspace(userId, result.workspaceMatch) : null;
  if (matched) {
    workspaceId = matched.id;
    await updateWorkspaceFields(userId, matched.id, mergeFields(matched.fields, result.fields));
  } else if (WORKSPACE_TEMPLATES.has(result.template)) {
    workspaceId = randomUUID();
    await insertWorkspace(userId, { id: workspaceId, templateType: result.template, name: result.title, fields: result.fields });
  }

  const item: ItemRow = {
    id: randomUUID(),
    type: result.template,
    title: result.title,
    createdAt: new Date().toISOString(),
    rawInput: text,
    fields: result.fields,
    workspaceId,
  };
  await insertItem(userId, item);

  const workspace = workspaceId ? await getWorkspace(userId, workspaceId) : null;
  res.json({ item, workspace });
});

app.get("/api/workspaces", requireAuth, async (req, res) => {
  res.json({ workspaces: await listWorkspaces(req.userId!) });
});
app.get("/api/items", requireAuth, async (req, res) => {
  res.json({ items: await listItems(req.userId!) });
});

await dbReady;
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  const m = modelInfo();
  console.log(
    `driftnet agent on :${port} | model ${m.provider}/${m.id} | key ${modelConfigured() ? "set" : "MISSING"} | voice ${transcribeEnabled() ? "elevenlabs" : "off"} | db ${process.env.DATABASE_URL ? "postgres" : "local pglite"}`,
  );
});
