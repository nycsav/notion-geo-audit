import * as cheerio from 'cheerio';
import type { CheckResult, SiteSnapshot } from './types.js';

/**
 * The AI crawlers that decide whether your site appears in AI answers.
 * Grouped by what blocking them costs you.
 */
export const AI_BOTS = [
  { ua: 'GPTBot', engine: 'ChatGPT (training + search index)' },
  { ua: 'OAI-SearchBot', engine: 'ChatGPT Search' },
  { ua: 'ChatGPT-User', engine: 'ChatGPT live browsing' },
  { ua: 'ClaudeBot', engine: 'Claude' },
  { ua: 'PerplexityBot', engine: 'Perplexity' },
  { ua: 'Google-Extended', engine: 'Gemini' },
  { ua: 'Applebot-Extended', engine: 'Apple Intelligence' },
  { ua: 'meta-externalagent', engine: 'Meta AI' },
  { ua: 'Amazonbot', engine: 'Alexa / Rufus' },
  { ua: 'Bytespider', engine: 'ByteDance / Doubao' },
];

/** The user-facing answer engines, mapped to the crawlers that feed them. */
export const ENGINES = [
  { name: 'ChatGPT', bots: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User'] },
  { name: 'Claude', bots: ['ClaudeBot'] },
  { name: 'Perplexity', bots: ['PerplexityBot'] },
  { name: 'Gemini', bots: ['Google-Extended'] },
];

export interface EngineView {
  engine: string;
  /** 0-100: how ready the site is for THIS engine (its crawler access + shared understand/quote signals) */
  score: number;
  access: 'allowed' | 'default' | 'blocked';
  recommendations: string[];
}

/**
 * Per-engine readiness, derived from the check results: each engine's crawler
 * access (40%) blended with the shared structure+content signals (60%) every
 * engine reads the same way.
 */
export function engineBreakdown(checks: CheckResult[]): EngineView[] {
  const robots = checks.find((c) => c.id === 'robots-ai-bots');
  const botState = new Map<string, 'allowed' | 'unlisted' | 'blocked'>();
  for (const d of robots?.details ?? []) {
    const m = d.match(/^(✓ allowed|· unlisted|🚫 blocked) — (\S+)/);
    if (m) botState.set(m[2], m[1].includes('allowed') ? 'allowed' : m[1].includes('blocked') ? 'blocked' : 'unlisted');
  }
  const shared = checks.filter((c) => c.pillar === 'structure' || c.pillar === 'content');
  const sharedPct = shared.reduce((s, c) => s + c.earned, 0) / Math.max(1, shared.reduce((s, c) => s + c.weight, 0));
  const sharedFixes = shared
    .filter((c) => c.status !== 'pass' && c.fix)
    .sort((a, b) => b.weight - a.weight)
    .map((c) => `${c.title}: ${c.fix}`);

  return ENGINES.map((e) => {
    const states = e.bots.map((b) => botState.get(b) ?? 'unlisted');
    const access: EngineView['access'] = states.includes('blocked') ? 'blocked' : states.includes('allowed') ? 'allowed' : 'default';
    const accessPts = access === 'blocked' ? 0 : access === 'allowed' ? 1 : 0.7;
    const recs: string[] = [];
    if (access === 'blocked') {
      const blockedBots = e.bots.filter((_, i) => states[i] === 'blocked');
      recs.push(`Unblock ${blockedBots.join(', ')} in robots.txt — ${e.name} cannot read or cite this site right now.`);
    } else if (access === 'default') {
      recs.push(`Name ${e.bots.join(', ')} explicitly in robots.txt — a clear welcome signal to ${e.name} that survives future "*" tightening.`);
    }
    recs.push(...sharedFixes);
    return { engine: e.name, score: Math.round((accessPts * 0.4 + sharedPct * 0.6) * 100), access, recommendations: recs.slice(0, 3) };
  });
}

type RobotsGroup = { agents: string[]; disallow: string[]; allow: string[] };

function parseRobots(body: string): { groups: RobotsGroup[]; sitemaps: string[] } {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'sitemap') {
      sitemaps.push(value);
    } else if (key === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current && (key === 'disallow' || key === 'allow')) {
      current[key].push(value);
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

/** Is this bot fully blocked ("Disallow: /") by its own group or the * group? */
function botBlocked(groups: RobotsGroup[], ua: string): boolean | 'unlisted' {
  const lower = ua.toLowerCase();
  const own = groups.find((g) => g.agents.includes(lower));
  const star = groups.find((g) => g.agents.includes('*'));
  const blockedBy = (g: RobotsGroup | undefined) =>
    !!g && g.disallow.some((d) => d === '/') && !g.allow.some((a) => a === '/');
  if (own) return blockedBy(own);
  if (star) return blockedBy(star) ? true : 'unlisted';
  return 'unlisted';
}

function result(partial: Omit<CheckResult, 'earned'> & { earned?: number }): CheckResult {
  const earned =
    partial.earned ??
    (partial.status === 'pass' ? partial.weight : partial.status === 'warn' ? Math.round(partial.weight / 2) : 0);
  return { ...partial, earned };
}

export function runChecks(snap: SiteSnapshot): CheckResult[] {
  const checks: CheckResult[] = [];
  const $ = cheerio.load(snap.html || '<html></html>');
  // <br> renders as whitespace but cheerio .text() drops it, gluing words together ("Strategyto Ship")
  $('br').replaceWith(' ');
  const host = new URL(snap.origin).hostname;

  // ---------- PILLAR 1: CRAWLABILITY ----------

  // Site reachable over HTTPS
  checks.push(
    result({
      id: 'https-reachable',
      title: 'Site loads over HTTPS',
      pillar: 'crawlability',
      weight: 5,
      status: snap.status >= 200 && snap.status < 400 && snap.origin.startsWith('https://') ? 'pass' : 'fail',
      finding:
        snap.status === 0
          ? 'The site did not respond.'
          : `Home page returned HTTP ${snap.status} at ${snap.origin}.`,
      fix: snap.status === 0 ? 'Make sure the site is online and serves HTTPS.' : undefined,
    }),
  );

  // robots.txt exists
  const robots = snap.robotsTxt;
  const parsed = robots.ok ? parseRobots(robots.body) : { groups: [], sitemaps: [] };
  checks.push(
    result({
      id: 'robots-exists',
      title: 'robots.txt present',
      pillar: 'crawlability',
      weight: 5,
      status: robots.ok ? 'pass' : 'warn',
      finding: robots.ok
        ? `Found at ${robots.url}.`
        : 'No robots.txt. Most crawlers treat this as "allow everything", but you lose the ability to declare AI policy and your sitemap.',
      fix: robots.ok ? undefined : 'Add a robots.txt at the site root (snippet below covers AI engines + sitemap).',
    }),
  );

  // AI bots allowed
  if (robots.ok) {
    const blocked = AI_BOTS.filter((b) => botBlocked(parsed.groups, b.ua) === true);
    const unlisted = AI_BOTS.filter((b) => botBlocked(parsed.groups, b.ua) === 'unlisted');
    const status = blocked.length > 0 ? 'fail' : unlisted.length === AI_BOTS.length ? 'warn' : 'pass';
    checks.push(
      result({
        id: 'robots-ai-bots',
        title: 'AI crawlers allowed in robots.txt',
        pillar: 'crawlability',
        weight: 15,
        status,
        finding:
          blocked.length > 0
            ? `Blocking ${blocked.length} AI engine(s): ${blocked.map((b) => `${b.ua} (${b.engine})`).join(', ')}. Those engines cannot cite you.`
            : unlisted.length === AI_BOTS.length
              ? 'No AI crawlers are named. They default to your "*" rules — that works, but naming them is an explicit welcome signal and survives future "*" tightening.'
              : `AI crawlers are allowed (${AI_BOTS.length - unlisted.length} named explicitly).`,
        fix:
          status === 'pass'
            ? undefined
            : 'Explicitly allow the AI engines you want to be represented in.',
        snippet:
          status === 'pass'
            ? undefined
            : AI_BOTS.map((b) => `User-agent: ${b.ua}\nAllow: /`).join('\n\n') +
              `\n\nSitemap: ${snap.origin}/sitemap.xml`,
        details: AI_BOTS.map((b) => {
          const v = botBlocked(parsed.groups, b.ua);
          return `${v === true ? '🚫 blocked' : v === 'unlisted' ? '· unlisted' : '✓ allowed'} — ${b.ua} (${b.engine})`;
        }),
      }),
    );
  } else {
    checks.push(
      result({
        id: 'robots-ai-bots',
        title: 'AI crawlers allowed in robots.txt',
        pillar: 'crawlability',
        weight: 15,
        status: 'warn',
        finding: 'Cannot verify AI crawler policy without a robots.txt.',
        fix: 'Create robots.txt and explicitly allow AI engines.',
        snippet:
          AI_BOTS.map((b) => `User-agent: ${b.ua}\nAllow: /`).join('\n\n') +
          `\n\nSitemap: ${snap.origin}/sitemap.xml`,
      }),
    );
  }

  // Sitemap
  const sitemapOk = snap.sitemap.ok && /<(urlset|sitemapindex)[\s>]/i.test(snap.sitemap.body);
  const sitemapDeclared = parsed.sitemaps.length > 0;
  checks.push(
    result({
      id: 'sitemap',
      title: 'XML sitemap present and declared',
      pillar: 'crawlability',
      weight: 8,
      status: sitemapOk ? (sitemapDeclared ? 'pass' : 'warn') : 'fail',
      finding: sitemapOk
        ? sitemapDeclared
          ? `Sitemap at ${snap.sitemap.url}, declared in robots.txt.`
          : `Sitemap at ${snap.sitemap.url}, but robots.txt does not declare it.`
        : 'No sitemap.xml found. Crawlers discover your pages slower and may miss deep ones.',
      fix: sitemapOk
        ? sitemapDeclared
          ? undefined
          : 'Add a "Sitemap:" line to robots.txt.'
        : 'Generate a sitemap.xml (most frameworks and CMSs have this built in) and declare it in robots.txt.',
      snippet: sitemapOk && sitemapDeclared ? undefined : `Sitemap: ${snap.origin}/sitemap.xml`,
    }),
  );

  // llms.txt
  checks.push(
    result({
      id: 'llms-txt',
      title: 'llms.txt for AI assistants',
      pillar: 'crawlability',
      weight: 8,
      status: snap.llmsTxt.ok ? 'pass' : 'warn',
      finding: snap.llmsTxt.ok
        ? `Found at ${snap.llmsTxt.url} (${snap.llmsTxt.body.length} chars).`
        : 'No llms.txt. This emerging standard gives AI assistants a curated, plain-text map of who you are and your best pages.',
      fix: snap.llmsTxt.ok
        ? undefined
        : 'Add /llms.txt — a short markdown file: one-line definition of the site, then links to your most important pages with one-line descriptions.',
      snippet: snap.llmsTxt.ok
        ? undefined
        : `# ${host}\n\n> One sentence that defines who you are and what you do.\n\n## Key pages\n\n- [About](${snap.origin}/about): Who we are\n- [Services](${snap.origin}/services): What we offer\n- [Contact](${snap.origin}/contact): How to reach us`,
    }),
  );

  // ---------- PILLAR 2: STRUCTURE (machine-readable identity) ----------

  // JSON-LD structured data
  const ldBlocks: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    ldBlocks.push($(el).text());
  });
  const ldTypes = new Set<string>();
  let ldParseErrors = 0;
  for (const block of ldBlocks) {
    try {
      const parsedLd = JSON.parse(block);
      const items = Array.isArray(parsedLd) ? parsedLd : parsedLd['@graph'] ? parsedLd['@graph'] : [parsedLd];
      for (const item of items) {
        const t = item?.['@type'];
        if (typeof t === 'string') ldTypes.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && ldTypes.add(x));
      }
    } catch {
      ldParseErrors++;
    }
  }
  const hasIdentity = ['Organization', 'LocalBusiness', 'Person', 'ProfessionalService', 'Corporation', 'WebSite'].some((t) =>
    ldTypes.has(t),
  );
  checks.push(
    result({
      id: 'json-ld',
      title: 'JSON-LD structured data (schema.org)',
      pillar: 'structure',
      weight: 15,
      status: ldBlocks.length === 0 ? 'fail' : hasIdentity && ldParseErrors === 0 ? 'pass' : 'warn',
      finding:
        ldBlocks.length === 0
          ? 'No JSON-LD found on the home page. AI engines have to guess who you are instead of being told.'
          : `${ldBlocks.length} JSON-LD block(s); types: ${[...ldTypes].join(', ') || 'none parsed'}${ldParseErrors ? `; ${ldParseErrors} block(s) failed to parse` : ''}${hasIdentity ? '' : '; no identity type (Organization/Person/WebSite)'}.`,
      fix:
        ldBlocks.length === 0 || !hasIdentity
          ? 'Add an Organization (or Person, for an individual) JSON-LD block to your home page — this is how AI engines disambiguate you from similarly-named entities.'
          : ldParseErrors
            ? 'Fix the JSON-LD blocks that fail to parse (invalid JSON is ignored by engines).'
            : undefined,
      snippet:
        ldBlocks.length === 0 || !hasIdentity
          ? `<script type="application/ld+json">\n${JSON.stringify(
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Your Name',
                url: snap.origin,
                description: 'One sentence that defines you.',
                sameAs: ['https://www.linkedin.com/company/yourname', 'https://github.com/yourname'],
              },
              null,
              2,
            )}\n</script>`
          : undefined,
      details: ldTypes.size ? [...ldTypes].map((t) => `✓ ${t}`) : undefined,
    }),
  );

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href');
  let canonicalStatus: 'pass' | 'warn' | 'fail' = 'warn';
  let canonicalFinding = 'No canonical URL on the home page. Engines may index duplicate variants (www/non-www, trailing slash).';
  if (canonical) {
    try {
      const c = new URL(canonical, snap.origin);
      const sameHost = c.hostname === host;
      canonicalStatus = sameHost ? 'pass' : 'warn';
      canonicalFinding = sameHost
        ? `Canonical set: ${c.toString()}.`
        : `Canonical points to a different host (${c.hostname}) than the audited origin (${host}).`;
    } catch {
      canonicalStatus = 'warn';
      canonicalFinding = `Canonical present but not a valid URL: "${canonical}".`;
    }
  }
  checks.push(
    result({
      id: 'canonical',
      title: 'Canonical URL',
      pillar: 'structure',
      weight: 5,
      status: canonicalStatus,
      finding: canonicalFinding,
      fix: canonicalStatus === 'pass' ? undefined : `Add <link rel="canonical" href="${snap.origin}/"> (and per-page equivalents).`,
    }),
  );

  // OG tags
  const og = {
    title: $('meta[property="og:title"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    url: $('meta[property="og:url"]').attr('content'),
  };
  const ogMissing = Object.entries(og)
    .filter(([, v]) => !v)
    .map(([k]) => `og:${k}`);
  checks.push(
    result({
      id: 'og-tags',
      title: 'Open Graph tags',
      pillar: 'structure',
      weight: 5,
      status: ogMissing.length === 0 ? 'pass' : ogMissing.length <= 2 ? 'warn' : 'fail',
      finding:
        ogMissing.length === 0
          ? 'og:title, og:description, og:image, og:url all present.'
          : `Missing: ${ogMissing.join(', ')}. These control how you look when AI answers and chats link to you.`,
      fix: ogMissing.length === 0 ? undefined : 'Add the missing Open Graph meta tags with absolute URLs.',
    }),
  );

  // Title + meta description
  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';
  checks.push(
    result({
      id: 'title-meta',
      title: 'Title and meta description',
      pillar: 'structure',
      weight: 5,
      status: title && metaDesc ? 'pass' : title || metaDesc ? 'warn' : 'fail',
      finding:
        title && metaDesc
          ? `Title (${title.length} chars) and meta description (${metaDesc.length} chars) present.`
          : `${title ? '' : 'Missing <title>. '}${metaDesc ? '' : 'Missing meta description.'}`.trim(),
      fix: title && metaDesc ? undefined : 'Add a unique title and a 150–160 character meta description to every page.',
    }),
  );

  // Robots meta not blocking
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
  const noindex = /noindex/.test(robotsMeta);
  checks.push(
    result({
      id: 'meta-robots',
      title: 'Page is indexable (no noindex)',
      pillar: 'structure',
      weight: 5,
      status: noindex ? 'fail' : 'pass',
      finding: noindex
        ? `Home page has "noindex" in its robots meta tag — engines are told to forget it.`
        : robotsMeta
          ? `Robots meta: "${robotsMeta}".`
          : 'No restrictive robots meta tag.',
      fix: noindex ? 'Remove "noindex" from the robots meta tag (unless this is intentional).' : undefined,
    }),
  );

  // ---------- PILLAR 3: CONTENT (answer-ready writing) ----------

  // H1
  const h1s = $('h1');
  checks.push(
    result({
      id: 'h1',
      title: 'Single clear H1',
      pillar: 'content',
      weight: 4,
      status: h1s.length === 1 ? 'pass' : h1s.length > 1 ? 'warn' : 'fail',
      finding:
        h1s.length === 1
          ? `H1: "${h1s.first().text().trim().slice(0, 80)}"`
          : h1s.length > 1
            ? `${h1s.length} H1 tags — engines can't tell which is the page's claim.`
            : 'No H1 on the home page.',
      fix: h1s.length === 1 ? undefined : 'Use exactly one H1 that states what the page is about.',
    }),
  );

  // AEO definition-lead: does early visible text define the entity? ("X is a ...")
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const firstChunk = bodyText.slice(0, 1200);
  const definitionPattern = /\b[A-Z][\w&.\- ]{1,60}\s+(is|are)\s+(a|an|the)\s+\w+/;
  const hasDefinition = definitionPattern.test(firstChunk) || definitionPattern.test(metaDesc);
  checks.push(
    result({
      id: 'aeo-definition',
      title: 'Definition-lead sentence (AEO)',
      pillar: 'content',
      weight: 10,
      status: hasDefinition ? 'pass' : 'warn',
      finding: hasDefinition
        ? 'Early page text (or meta description) contains a definition-style sentence — the exact shape AI answers quote.'
        : 'No "X is a …" definition found in the first screen of text. AI engines favor pages that define their subject in one quotable sentence.',
      fix: hasDefinition
        ? undefined
        : `Open the page with one plain sentence: "${host.replace(/^www\./, '')} is a [what you are] that [what you do] for [whom]." Then continue as normal.`,
    }),
  );

  // FAQ schema (answer-ready content)
  const hasFaq = ldTypes.has('FAQPage');
  checks.push(
    result({
      id: 'faq-schema',
      title: 'FAQ schema',
      pillar: 'content',
      weight: 6,
      status: hasFaq ? 'pass' : 'warn',
      finding: hasFaq
        ? 'FAQPage schema present — questions and answers are machine-readable.'
        : 'No FAQPage schema on the home page. FAQs are the most directly quotable format for AI answers.',
      fix: hasFaq
        ? undefined
        : 'Add a short FAQ (3–6 real questions people ask you) with FAQPage JSON-LD on a relevant page.',
    }),
  );

  // ---------- PILLAR 4: CONNECTIVITY (feeds + agent access) ----------

  // RSS/Atom feed
  checks.push(
    result({
      id: 'feed',
      title: 'RSS/Atom feed',
      pillar: 'connectivity',
      weight: 4,
      status: snap.feed.ok ? 'pass' : 'warn',
      finding: snap.feed.ok
        ? `Feed at ${snap.feed.url} (found via ${snap.feed.discoveredVia}).`
        : 'No feed found. Feeds are the cheapest way to push fresh content to aggregators and AI crawlers.',
      fix: snap.feed.ok
        ? undefined
        : 'Publish an RSS/Atom feed and reference it with <link rel="alternate" type="application/rss+xml" href="/feed.xml">.',
    }),
  );

  // MCP manifest — the "connector" frontier
  let mcpValid = false;
  if (snap.mcpManifest.ok) {
    try {
      JSON.parse(snap.mcpManifest.body);
      mcpValid = true;
    } catch {
      mcpValid = false;
    }
  }
  checks.push(
    result({
      id: 'mcp-manifest',
      title: 'MCP endpoint (/.well-known/mcp.json)',
      pillar: 'connectivity',
      weight: 5,
      status: mcpValid ? 'pass' : 'warn',
      finding: mcpValid
        ? `MCP manifest found — AI agents can discover how to connect to you directly.`
        : snap.mcpManifest.ok
          ? 'A /.well-known/mcp.json exists but is not valid JSON.'
          : 'No MCP manifest. Optional, but it is the emerging way for AI agents to discover a site\'s official connector.',
      fix: mcpValid
        ? undefined
        : 'Optional frontier move: publish /.well-known/mcp.json describing your MCP server (or your contact endpoint) so agents can find the official integration.',
      snippet: mcpValid
        ? undefined
        : JSON.stringify({ name: host, description: 'One sentence about this site.', url: snap.origin, contact: `hello@${host.replace(/^www\./, '')}` }, null, 2),
    }),
  );

  return checks;
}
