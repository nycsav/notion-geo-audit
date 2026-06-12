# Contributing to geo-audit

Thanks for helping make AI visibility free for everyone. This project is intentionally small and readable — that's a feature, please keep it that way.

## Quick orientation

| Where | What |
|---|---|
| `src/` | The audit engine — 15 checks, 4 pillars. **Edit checks here.** |
| `src/checks.ts` | All check logic + the per-engine breakdown |
| `docs/` | The deployed site (geo.ensolabs.ai) — static pages + `/api` serverless functions |
| `docs/api/_lib/` | **Generated** — synced from `src/` via `npm run sync-api`. Never edit directly. |
| `worker/` | The Notion Worker (`auditSite` agent tool) |
| `scripts/` | Notion database sync |

## Dev setup

```bash
git clone https://github.com/nycsav/notion-geo-audit && cd notion-geo-audit
npm install
npx tsx src/cli.ts example.com        # run the audit
npm run build                          # type-check + compile
```

## Making a change

1. Fork + branch (`feat/check-name` or `fix/short-description`)
2. If you touched `src/`, run `npm run sync-api` so the web API picks it up
3. Smoke test: `npx tsx src/cli.ts ensolabs.ai` should score 100/100
4. Open a PR with a one-paragraph description of what and why

## Adding a new check

Each check in `src/checks.ts` pushes a `CheckResult`: id, title, pillar, weight, status, a plain-English finding, and — for any non-pass — a `fix` and ideally a copy-paste `snippet`. The bar: **a non-developer reading the report should know exactly what to do next.** Keep total weights summing to 100.

## Good first issues

Look for the [`good first issue`](https://github.com/nycsav/notion-geo-audit/labels/good%20first%20issue) label. The [roadmap](https://github.com/nycsav/notion-geo-audit/issues?q=label%3Aroadmap) has bigger ideas.

## Principles

- **The core audit stays zero-API-key.** Paid APIs (Perplexity, Anthropic) are optional layers only.
- Plain English over jargon — the audience includes barbershops and nonprofits, not just devs.
- No tracking, no signup, nothing stored outside the user's control.

MIT licensed — by contributing you agree your work ships under the same license.
