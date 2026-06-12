# geo-audit × Notion Workers

Run the GEO audit **inside Notion** — no servers, no laptop. This folder is a
[Notion Worker](https://developers.notion.com/workers/get-started/overview) exposing:

| Capability | What it does |
|---|---|
| `auditSite` (tool) | Your **Notion Custom Agent** audits any URL on demand — just ask in Notion chat |

Ask your agent things like:

> "Audit brainstation.io and add the result to the GEO Audit Results database."

The agent calls `auditSite` for the score and writes the database row itself — no
extra wiring.

## Deploy in 4 steps

```bash
# 1 · Install the Notion CLI (once)
curl -fsSL https://ntn.dev | bash

# 2 · Sign in to your workspace
ntn login

# 3 · Deploy this worker
cd worker && npm install
ntn workers deploy --name geo-audit

# 4 · In Notion: add the geo-audit worker's `auditSite` tool to any Custom Agent.
```

Smoke-test from the terminal (runs in Notion's hosted runtime):

```bash
ntn workers exec auditSite -d '{"url":"example.com"}'
```

## Notes

- **Pricing:** Workers are free during beta; from **Aug 11, 2026** they run on Notion credits.
- The worker uses a fetch+regex **"lite" engine** (sandbox-friendly — no DOM parser, strict
  pass/fail, no partial credit), so its scores run lower than the full engine's. For the full
  15-check report with copy-paste fixes, use [geo.ensolabs.ai](https://geo.ensolabs.ai),
  the CLI, or the Claude MCP connector in the repo root.
- **v2 shape:** a worker-managed scoreboard database synced on a schedule via `worker.sync()`
  — see `.examples/sync-example.ts` in [makenotion/workers-template](https://github.com/makenotion/workers-template).
- Official scaffold this follows: [makenotion/workers-template](https://github.com/makenotion/workers-template) ·
  Agent skills: [makenotion/skills](https://github.com/makenotion/skills) ·
  Cookbook: [makenotion/notion-cookbook](https://github.com/makenotion/notion-cookbook)
