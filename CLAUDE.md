# notion-geo-audit — Project Guide

## What this is
Free, open-source GEO (Generative Engine Optimization) audit tool by Enso Labs. Scores any website's AI-search visibility (ChatGPT, Claude, Perplexity, Gemini) /100 with copy-paste fixes. Built Jun 12 2026 for the Notion Community Showcase; mission: give communities free AI-visibility tooling.

## Live surfaces (all launched, public)
- **Site:** https://geo.ensolabs.ai — interactive in-browser audit (dark AI-terminal design, Jun 12 PM redesign) + tools page (4 no-code generators) + presentation deck (13 slides) + "Ask geo-audit" chatbot + architecture map. Self-audit score: **100/100** (dogfooded 50→100; re-verified after redesign).
- **API:** `/api/audit?url=` (15 checks + per-engine breakdown + notionSite flag) and `/api/representation?url=` (live Perplexity check, rate-limited 1/min/IP + 300/day; PERPLEXITY_API_KEY set in Vercel env, Production).
- **Repo:** https://github.com/nycsav/notion-geo-audit — PUBLIC, MIT, 14 topics. Local folder name is `geo-audit`, repo name is `notion-geo-audit`.
- **Notion hub:** 📡 "geo-audit — Community GEO Demo" (page 37d0bdff-e59e-815d-aa7e-eefdba8dc23c) with sub-pages: DIY connect guide, instruction manual, SEO/GEO checklist, 🏁 GEO Scoreboard template (PUBLISHED + duplicate-as-template ON: square-denim-cf9.notion.site/GEO-Scoreboard-... — subdomain rename to `ensolabs` pending, update links everywhere after).
- **Results DB (demo):** data source 4e47fbf4-1dd1-44fb-94f9-6c1797c6d241 · **Template scoreboard DB:** data source 2c048e4a-b884-46f4-a26e-626f00ccec63

## Architecture
- `src/snapshot.ts` → fetch site's public files · `src/checks.ts` → 15 checks, 4 pillars (crawlability/structure/content/connectivity) · `src/report.ts` → score + markdown/terminal output · `src/representation.ts` → optional Perplexity "how does AI describe you" (needs PERPLEXITY_API_KEY in gitignored `.env`)
- `src/cli.ts` — `npx tsx src/cli.ts <url> [--md out.md|--json|--representation]`
- `src/mcp.ts` — MCP server (tools: `audit_site`, `check_ai_representation`), wired via project `.mcp.json`; loads `.env` itself so keys never sit in client config
- `scripts/notion-sync.ts` — audit → row in Notion DB (needs NOTION_TOKEN + NOTION_DATABASE_ID in `.env`)
- `worker/` — **Notion Worker, DEPLOYED Jun 12** (worker id 019ebd2a-f6ee-7260-9016-7cb7bd5abecf, name `geo-audit`, Enso Labs workspace). `auditSite` tool live in Notion's runtime — verified via `ntn workers exec auditSite -d '{"url":"..."}'`. Uses real SDK shape: `worker.tool(name, {title, description, schema: j.object(...), execute})` from `@notionhq/workers` + schema-builder. Lite engine = strict pass/fail (scores lower than full engine). Redeploy: `cd worker && ntn workers deploy`. v2: worker.sync() managed scoreboard DB.
- `docs/` — the Vercel-deployed static site (deploys from this subfolder)

## Build / deploy
```bash
npm run build                      # tsc → dist/
npx tsx src/cli.ts ensolabs.ai     # smoke test (expect 100/100)
npm run sync-api                   # copy src engine → docs/api/_lib (REQUIRED after editing src/)
cd docs && vercel deploy --prod --yes   # Vercel project: notion-geo-audit, scope nycsavs-projects
```
The serverless functions in `docs/api/` import from `docs/api/_lib/` — never edit `_lib` directly; edit `src/` and re-run `npm run sync-api`.
Git: commit to main, push to origin (github.com/nycsav/notion-geo-audit). Vercel does NOT auto-deploy — deploy manually from docs/.

## Rules
- Brand: warm editorial "Strategy to Ship" palette — Paper #F7F1E6, Ink #1E1813, Ship Coral #F0512E, Lora/Inter Tight/JetBrains Mono. "Powered by Enso Labs" on everything.
- Keep the core audit zero-API-key. Perplexity/Notion keys are optional layers, always in gitignored `.env`.
- The publishing brand formerly "signal2noise" is now **Strategy to Ship**; Enso Labs is the studio. Don't mix this repo with the Career Command Center / job-agent project (separate demo).

## Pending (as of Jun 12)
1. `ntn login` (Sav, interactive) → `cd worker && ntn workers deploy` → attach auditSite to a "GEO Audit Agent" in Notion
2. Rename notion.site subdomain square-denim-cf9 → ensolabs (Settings → Public pages → Domains), then update template links in Notion hub + README
3. v2 roadmap: GA4 referral-traffic agent, scheduled re-audits, Notion template gallery submission
