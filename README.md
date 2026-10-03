# Driftnet

Information doesn't disappear because you forgot it — it disappears because filing it away took more effort than it was worth. A link gets bookmarked and never found again. An idea surfaces mid-conversation and is gone by the time you open a notes app. A new project starts from a blank page every time, even though the structure it needs is basically the same as the last five.

Driftnet is a single capture point — type, paste, or speak — that catches whatever you throw at it and figures out what it actually is: a hackathon you just found with a deadline attached, a loose idea for later, a resource worth keeping. It files each one into a structured, ready-to-work-on workspace instead of another flat note, using templates for the kinds of things that come up again and again.

Built for Hacktoberfest's "Build for a Friend" weekend challenge, around a very literal friend: myself, and the way every hackathon idea I've ever had has started life as a scattered link, a half-written note, or a voice memo I meant to come back to.

## How it's built

- **Capture → structure pipeline**: an agent built on [Mastra](https://mastra.ai), an open-source TypeScript agent framework, classifies incoming text against a set of templates and extracts the fields that matter.
- **Reasoning model**: [Gemma](https://ai.google.dev/gemma), an open-weight model, does the classification and extraction — no closed model required for the core loop to work.
- **Voice capture**: ElevenLabs Scribe turns a spoken capture into text before it hits the same pipeline as anything typed.
- **Accounts and sync**: email and password sign-in, with every capture stored per user in Postgres, so the same workspaces show up on a laptop and a phone. With no `DATABASE_URL` set, the agent falls back to an in-process local Postgres (PGlite) for development.

See `SPEC.md` for the full architecture and API contract, and `frontend/` / `agent/` for the two halves of the build.

## Running locally

```
# agent service
cd agent
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

See each folder's `.env.example` for the API keys needed.
