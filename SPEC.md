# Driftnet — Architecture & Build Spec

Catch anything messy — a link, a voice note, a pasted paragraph — and turn it into a structured, ready-to-work-on workspace, instead of another place to dump notes.

## Core loop

1. Capture (text paste, typed note, or voice recording) in the frontend.
2. If voice: transcribed client-side via the browser's built-in speech recognition for now (no API key needed). This swaps to ElevenLabs Scribe, via the agent service, once API credits are available — the contract below already reflects that end state.
3. Send the resulting text to the agent service's capture endpoint.
4. The agent (built on Mastra, reasoning with Gemma) classifies the input against a set of templates, extracts structured fields, and either creates a new workspace or files the item into an existing one.
5. The frontend shows the result immediately: a structured workspace card, not a raw note.

## Monorepo layout

```
driftnet/
  SPEC.md              <- this file, shared contract
  README.md            <- public-facing project description
  frontend/            <- Next.js app (UI, capture bar, workspace views)
  agent/                <- Node/TypeScript service (Mastra agent, Gemma, ElevenLabs Scribe, storage)
```

The two folders are independent services during development (agent runs on its own port, frontend calls it over HTTP) and can be combined or kept separate for deployment — whichever is faster to ship by the deadline.

## Agent service contract (`agent/`)

Base URL during dev: `http://localhost:4000`

### `POST /api/transcribe`
Request: raw audio bytes as the body, with the recording's Content-Type header (webm/mp3/wav).
Response: `{ "transcript": string }`
Implementation: ElevenLabs Scribe speech-to-text. Returns 501 when no ElevenLabs key is set; `GET /api/health` reports `transcribe: true/false` so the frontend falls back to browser speech recognition.

### `POST /api/capture`
Request: `{ "text": string, "source"?: string }`
Response:
```json
{
  "item": {
    "id": "string",
    "type": "hackathon | idea | resource | task | note",
    "title": "string",
    "createdAt": "ISO timestamp",
    "rawInput": "string",
    "fields": { "...": "template-specific key/value pairs" },
    "workspaceId": "string | null"
  },
  "workspace": {
    "id": "string",
    "templateType": "hackathon | project | generic",
    "name": "string",
    "fields": { "...": "..." },
    "itemIds": ["string"]
  }
}
```
Implementation: a Mastra agent/workflow that:
1. Classifies `text` against the templates in `agent/templates/*.json`.
2. Extracts fields per the matched template's schema using Gemma (via whatever provider is fastest to key up — Google AI Studio or Groq both serve Gemma models; pick whichever has a working API key first).
3. Looks for an existing open workspace this item belongs to (e.g. same hackathon name/deadline mentioned again) — if none, creates one.
4. Persists both the item and the workspace to Postgres, scoped to the signed-in user (`DATABASE_URL`; PGlite locally when unset).

### `GET /api/workspaces`
Response: `{ "workspaces": Workspace[] }` (each with its nested items).

### `GET /api/items`
Response: `{ "items": CapturedItem[] }` — flat list, newest first, for an "Inbox" view of anything not yet filed into a workspace.

## Templates (`agent/templates/`)

Ship at least these two, as JSON files describing the field schema the model should fill in:

**`hackathon.json`** — fields: `name`, `deadline`, `source`, `projectIdea`, `techStack`, `resources` (array), `tasks` (array), `status`, `notes`.

**`idea.json`** — fields: `summary`, `category`, `relatedTo`, `nextAction`.

Add `resource.json` (a saved link) and `task.json` (a standalone to-do) if time allows — same pattern.

## Frontend (`frontend/`)

Already scaffolded: Next.js (App Router) + TypeScript + Tailwind.

Screens needed:
- **Capture bar** (persistent, top of page): a text input + "record voice" button. Submitting calls the agent's `/api/capture` (through `/api/transcribe` first if it's a voice note).
- **Workspaces view**: cards grouped by workspace (e.g. the Hackathon Workspace created from this very Hacktoberfest brief), showing the structured fields and nested items.
- **Inbox view**: flat list of ungrouped captured items (ideas, loose resources).

Keep styling clean and minimal — this is a demo for a write-up, not a production app. Tailwind defaults are fine; no need for a heavy design pass.

## What NOT to build (scope guard for the deadline)

- No teams or sharing between accounts.
- No mobile app / browser extension — web only.
- No social login, password reset or email verification: email and password with a bearer token is enough for the demo.
- No more than the templates listed above unless everything else is done early.

## Demo script (for the write-up and any recording)

1. Open Driftnet.
2. Paste the raw Hacktoberfest Weekend Challenge announcement text into the capture bar.
3. Driftnet classifies it as a hackathon opportunity, extracts the deadline (Oct 5, 6:59 AM UTC), prize categories, and theme, and creates a "Hacktoberfest Weekend Challenge" workspace with a starter task list — instead of a blank note.
4. Capture a second, unrelated loose idea by voice ("I just thought of a feature for X") and show it landing in the Inbox, correctly classified as an idea, not a hackathon.
5. Show asking "what's due soonest" style retrieval if time allows (optional stretch).

## Accounts

- `POST /api/auth/signup` and `POST /api/auth/login` take `{ email, password }` (password at least 8 characters) and return `{ token, user }`. The token is a 30-day signed JWT sent as `Authorization: Bearer <token>`.
- `GET /api/auth/me` returns the signed-in user.
- `/api/capture`, `/api/workspaces`, `/api/items` and `/api/transcribe` require a token. Every query is filtered by the token's user id, so accounts never see each other's data. `GET /api/health` stays public.
- Auth routes are rate limited per IP. The frontend keeps the token in localStorage so a session survives refreshes and works on phones.
