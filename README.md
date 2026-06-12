# geo-audit

**Free GEO (Generative Engine Optimization) audit for any website. No API keys, no login, no tracking.**

AI search engines — ChatGPT, Claude, Perplexity, Gemini — are how people increasingly find businesses. If those engines can't reach your site, can't tell who you are, or can't quote you, you don't exist in their answers. Big companies pay enterprise tools to fix this. **This tool gives the same checklist to everyone.**

Built by [Enso Labs](https://ensolabs.ai) for community builders, small businesses, and anyone who wants to own their own AI visibility.

```
$ npx tsx src/cli.ts yoursite.org

  GEO AUDIT  https://yoursite.org
  Score 71/100 — C — visible but under-represented in AI answers

  ✅  Site loads over HTTPS                         5/5
  🟡  AI crawlers allowed in robots.txt             8/15
  🟡  llms.txt for AI assistants                    4/8
  🟡  JSON-LD structured data (schema.org)          8/15
  ...
  Top fix: Explicitly allow the AI engines you want to be represented in.
```

## What it checks (15 checks, 4 pillars)

| Pillar | Checks |
|---|---|
| **1 · Crawlability** — can AI engines reach you? | HTTPS, robots.txt, **AI-crawler allowlist** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, +6 more), sitemap, **llms.txt** |
| **2 · Structure** — can they understand who you are? | **JSON-LD identity** (Organization/Person), canonical URL, Open Graph, title/meta, indexability |
| **3 · Content** — is your writing quotable? | Single H1, **definition-lead sentence** ("X is a …" — the shape AI answers quote), FAQ schema |
| **4 · Connectivity** — feeds & agent access | RSS/Atom feed, **MCP manifest** (`/.well-known/mcp.json`) |

Every failed check comes with a plain-English fix and a **copy-paste snippet** (a ready robots.txt block, an llms.txt template, a JSON-LD starter).

## Audit in the browser (no install)

Go to **[notion-geo-audit.vercel.app](https://notion-geo-audit.vercel.app)**, type your URL, press **AUDIT ▶**. You get:

- the full 15-check report with copy-paste fixes
- a **per-engine breakdown** — ChatGPT, Claude, Perplexity, and Gemini each scored separately (each engine reads your site with a different crawler, so the answers genuinely differ)
- a live **"how does AI describe you today"** check (Perplexity, rate-limited)
- **Notion mode** — audit any `*.notion.site` and see which fixes you control inside Notion vs. which need a custom domain

The **[tools page](https://notion-geo-audit.vercel.app/tools.html)** has free no-code generators for everything the audit asks for: a robots.txt AI-allowlist builder, an llms.txt generator, identity JSON-LD, and FAQ schema.

## Quick start

```bash
git clone https://github.com/nycsav/notion-geo-audit && cd notion-geo-audit
npm install

npx tsx src/cli.ts yoursite.org                      # terminal scorecard
npx tsx src/cli.ts yoursite.org --md report.md       # full report with fixes
npx tsx src/cli.ts yoursite.org --json               # for pipelines/agents
```

## Use it inside Claude (the GEO connector)

geo-audit ships as an MCP server, so your community can plug it straight into Claude and just ask:

> *"Audit mysite.org for AI visibility and walk me through the top 3 fixes."*

```bash
npm run build
claude mcp add geo-audit -- node /path/to/notion-geo-audit/dist/mcp.js
```

Tools exposed:
- `audit_site` — the full scored audit as markdown
- `check_ai_representation` — asks Perplexity, live, *"how do AI engines describe this site today, and which sources do they trust?"* (optional — set `PERPLEXITY_API_KEY`)

The second one matters: it shows you the **gap between who you are and how AI describes you** — including when engines confuse you with a similarly-named entity.

## Optional: live representation check

```bash
export PERPLEXITY_API_KEY=pplx-...
npx tsx src/cli.ts yoursite.org --representation
```

## Why we built this

Enso Labs took its own site from invisible to 100/100 on these checks — schema on every page, llms.txt, AI-crawler policy, definition-lead copy, an MCP endpoint. The method was the easy part; it just lived in private audits. This tool open-sources the method so any community — a forum, a small business group, a local org — can run it on their own sites and own their own representation.

**Roadmap:** GA4 traffic correlation (see which AI engines actually send you visitors) · Notion sync (audit history as a database) · scheduled re-audits.

## License

MIT — use it, fork it, run it for your community.

---

*Powered by [Enso Labs](https://ensolabs.ai) · Built with Claude Code*
