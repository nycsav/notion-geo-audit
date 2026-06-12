/**
 * geo-audit as a NOTION WORKER — runs inside Notion's hosted runtime.
 * No servers. Deploy once with the Notion CLI, then `auditSite` appears as a
 * TOOL your Notion Custom Agents can call on demand:
 *
 *   "Audit brainstation.io and add the result to the GEO Audit Results database."
 *
 * The agent runs the audit with this tool and writes the row itself — no sync
 * wiring needed. (A worker-managed scoreboard database via worker.sync() is the
 * v2 shape; see .examples/sync-example.ts in makenotion/workers-template.)
 *
 * Deploy:
 *   ntn login
 *   cd worker && npm install && ntn workers deploy --name geo-audit
 */
import { Worker } from '@notionhq/workers';
import { j } from '@notionhq/workers/schema-builder';

const worker = new Worker();
export default worker;

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

/* ---------- AGENT TOOL: Custom Agents call this on demand ---------- */

worker.tool('auditSite', {
  title: 'GEO Audit',
  description:
    'Run a GEO (Generative Engine Optimization) audit on a public website. Returns an AI-visibility score out of 100, a letter grade, and the prioritized fix list. Use when someone asks how visible a site is to AI search (ChatGPT, Claude, Perplexity, Gemini), or wants a site checked and the result added to a scoreboard database. The full report with copy-paste fixes lives at geo.ensolabs.ai.',
  schema: j.object({
    url: j.string().describe('The website to audit, e.g. example.com or https://example.com'),
  }),
  outputSchema: j.object({
    origin: j.string().describe('The normalized origin that was audited'),
    score: j.number().describe('AI-visibility score, 0-100'),
    grade: j.string().describe('Letter grade A-F'),
    fixes: j.array(j.string()).describe('Names of the failed checks, in audit order'),
    topFix: j.string().describe('The single highest-impact fix'),
  }),
  execute: async ({ url }) => auditLite(url),
});
