/**
 * geo-audit as a NOTION WORKER — runs inside Notion's hosted runtime.
 * No servers. Deploy once with the Notion CLI, then:
 *   · `auditSite` appears as a TOOL in your Notion Custom Agents
 *   · `scoreboardSync` re-audits your scoreboard on a schedule
 *
 * Deploy:
 *   curl -fsSL https://ntn.dev | bash     # install the Notion CLI (once)
 *   cd worker && ntn workers deploy
 *
 * Pattern follows the official template: github.com/makenotion/workers-template
 * Docs: developers.notion.com/workers/get-started/overview
 */
import { Worker } from '@notionhq/workers';

const worker = new Worker();

/* ---------- the audit engine (worker-sandbox friendly: fetch + regex only) ---------- */

const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot',
  'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'Amazonbot', 'Bytespider',
];

async function probe(url: string): Promise<{ ok: boolean; body: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = res.ok ? (await res.text()).slice(0, 500_000) : '';
    return { ok: res.ok && body.length > 0, body };
  } catch {
    return { ok: false, body: '' };
  }
}

export async function auditLite(input: string) {
  const origin = new URL(/^https?:/i.test(input) ? input : `https://${input}`).origin;
  const [home, robots, llms, sitemap, mcp] = await Promise.all([
    probe(origin + '/'),
    probe(origin + '/robots.txt'),
    probe(origin + '/llms.txt'),
    probe(origin + '/sitemap.xml'),
    probe(origin + '/.well-known/mcp.json'),
  ]);

  const html = home.body;
  const checks = [
    { name: 'HTTPS reachable', weight: 10, pass: home.ok },
    { name: 'robots.txt present', weight: 10, pass: robots.ok },
    { name: 'AI crawlers named in robots.txt', weight: 15, pass: AI_BOTS.some((b) => robots.body.includes(b)) },
    { name: 'llms.txt', weight: 10, pass: llms.ok },
    { name: 'XML sitemap', weight: 10, pass: sitemap.ok && /<(urlset|sitemapindex)/i.test(sitemap.body) },
    { name: 'JSON-LD structured data', weight: 15, pass: /application\/ld\+json/i.test(html) },
    { name: 'Canonical URL', weight: 5, pass: /rel=["']canonical["']/i.test(html) },
    { name: 'Open Graph tags', weight: 5, pass: /property=["']og:title["']/i.test(html) },
    { name: 'Definition-lead sentence', weight: 10, pass: /\b[A-Z][\w&.\- ]{1,60}\s+(is|are)\s+(a|an|the)\s+\w+/.test(html.replace(/<[^>]+>/g, ' ').slice(0, 4000)) },
    { name: 'FAQ schema', weight: 5, pass: /FAQPage/.test(html) },
    { name: 'MCP manifest', weight: 5, pass: mcp.ok },
  ];
  const max = checks.reduce((s, c) => s + c.weight, 0);
  const score = Math.round((checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0) / max) * 100);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F';
  const fixes = checks.filter((c) => !c.pass).map((c) => c.name);
  return { origin, score, grade, fixes, topFix: fixes[0] ?? 'None — every check passes.' };
}

/* ---------- 1 · AGENT TOOL: Custom Agents call this on demand ---------- */

worker.tool('auditSite', {
  description:
    'Run a GEO (Generative Engine Optimization) audit on a public website. Returns an AI-visibility score /100, grade, and the prioritized fix list.',
  input: { url: { type: 'string', description: 'Website to audit, e.g. example.com' } },
  handler: async ({ url }: { url: string }) => auditLite(url),
});

/* ---------- 2 · SCHEDULED SYNC: keeps the community scoreboard fresh ---------- */
// Re-audits every site in your "GEO Audit Results" database on Notion's schedule
// (default every 30 minutes; set it in the worker config). Wire the database id
// in ntn.config — see github.com/makenotion/workers-template for the sync shape.

worker.sync('scoreboardSync', {
  description: 'Re-audit every site in the GEO Audit Results database and refresh Score / Grade / Top Fix.',
  handler: async (ctx: any) => {
    const rows: Array<{ id: string; url: string }> = (await ctx?.database?.rows?.()) ?? [];
    const out = [];
    for (const row of rows) {
      if (!row.url) continue;
      const r = await auditLite(row.url);
      out.push({ id: row.id, Score: r.score, Grade: r.grade, 'Top Fix': r.topFix, Audited: new Date().toISOString().slice(0, 10) });
    }
    return out;
  },
});

export default worker;
