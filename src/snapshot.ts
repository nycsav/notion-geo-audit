import type { SiteSnapshot, TextProbe } from './types.js';

const UA = 'geo-audit/0.1 (+https://github.com/nycsav/geo-audit)';
const TIMEOUT_MS = 15_000;

async function get(url: string): Promise<{ status: number; body: string; finalUrl: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Cap bodies at 2MB — enough for any HTML/robots/sitemap we need to inspect
    const text = (await res.text()).slice(0, 2_000_000);
    return { status: res.status, body: text, finalUrl: res.url };
  } catch {
    return { status: 0, body: '', finalUrl: url };
  }
}

async function probe(url: string): Promise<TextProbe> {
  const { status, body } = await get(url);
  return { url, status, ok: status >= 200 && status < 300 && body.length > 0, body };
}

export function normalizeOrigin(input: string): string {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const u = new URL(raw);
  return u.origin;
}

/** Fetch everything the checks need, concurrently, in one pass. */
export async function takeSnapshot(input: string): Promise<SiteSnapshot> {
  const origin = normalizeOrigin(input);

  const home = await get(origin + '/');
  const finalOrigin = home.status > 0 ? new URL(home.finalUrl).origin : origin;

  const [robotsTxt, llmsTxt, sitemap, mcpManifest] = await Promise.all([
    probe(finalOrigin + '/robots.txt'),
    probe(finalOrigin + '/llms.txt'),
    probe(finalOrigin + '/sitemap.xml'),
    probe(finalOrigin + '/.well-known/mcp.json'),
  ]);

  // Feed discovery: <link rel="alternate" type="...rss/atom..."> first, then common paths
  let feed: SiteSnapshot['feed'] = { url: '', status: 0, ok: false, body: '' };
  const linkMatch = home.body.match(
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i,
  );
  const hrefMatch = linkMatch?.[0].match(/href=["']([^"']+)["']/i);
  if (hrefMatch) {
    const feedUrl = new URL(hrefMatch[1], finalOrigin).toString();
    feed = { ...(await probe(feedUrl)), discoveredVia: '<link rel="alternate">' };
  } else {
    for (const path of ['/feed.xml', '/rss.xml', '/feed', '/atom.xml']) {
      const p = await probe(finalOrigin + path);
      if (p.ok && /<(rss|feed)[\s>]/i.test(p.body)) {
        feed = { ...p, discoveredVia: `common path ${path}` };
        break;
      }
    }
  }

  return {
    origin: finalOrigin,
    finalUrl: home.finalUrl,
    html: home.body,
    status: home.status,
    robotsTxt,
    llmsTxt,
    sitemap,
    mcpManifest,
    feed,
  };
}
