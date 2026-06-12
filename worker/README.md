# geo-audit × Notion Workers

Run the GEO audit **inside Notion** — no servers, no laptop. This folder is a
[Notion Worker](https://developers.notion.com/workers/get-started/overview) that gives you:

| Capability | What it does |
|---|---|
| `auditSite` (tool) | Your **Notion Custom Agent** can audit any URL on demand — just ask it in Notion chat |
| `scoreboardSync` (sync) | Re-audits every row in your **GEO Audit Results** database on a schedule (default: every 30 min) |

## Deploy in 4 steps

```bash
# 1 · Install the Notion CLI (once)
curl -fsSL https://ntn.dev | bash

# 2 · Sign in to your workspace
ntn login

# 3 · Deploy this worker
cd worker
ntn workers deploy

# 4 · In Notion: Settings → Connections → your worker is live.
#     Add `auditSite` as a tool to any Custom Agent.
```

Then in Notion, ask your agent:

> "Audit brainstation.io and add the result to the GEO Audit Results database."

## Notes

- **Pricing:** Workers are free during beta; from **Aug 11, 2026** they run on Notion credits.
- The worker uses a fetch+regex "lite" engine (sandbox-friendly — no DOM parser). For the full
  15-check engine with copy-paste fix snippets, use the CLI or Claude MCP connector in the repo root.
- Official scaffold this follows: [makenotion/workers-template](https://github.com/makenotion/workers-template) ·
  Agent skills: [makenotion/skills](https://github.com/makenotion/skills) ·
  Cookbook: [makenotion/notion-cookbook](https://github.com/makenotion/notion-cookbook)
- The `scoreboardSync` database wiring follows the workers-template sync shape — set your
  database id in the worker config when you deploy.
