/**
 * GET /api/audit?url=yoursite.org
 * Runs the full 15-check GEO audit server-side and returns the scored report as JSON.
 * The engine in ./_lib is synced from src/ — edit there, then `npm run sync-api`.
 */
import { takeSnapshot, normalizeOrigin } from './_lib/snapshot.js';
import { runChecks, engineBreakdown } from './_lib/checks.js';
import { buildReport } from './_lib/report.js';

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h.includes(':')) return true; // raw IPv6
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  const url = String(req.query?.url ?? '').trim();
  if (!url) return res.status(400).json({ error: 'Pass ?url=yoursite.org' });

  let origin: string;
  try {
    origin = normalizeOrigin(url);
  } catch {
    return res.status(400).json({ error: 'That does not look like a valid URL.' });
  }
  if (isBlockedHost(new URL(origin).hostname)) {
    return res.status(400).json({ error: 'That host cannot be audited.' });
  }

  try {
    const snap = await takeSnapshot(origin);
    const checks = runChecks(snap);
    const report = buildReport(snap.origin, checks);
    res.setHeader('cache-control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      report,
      engines: engineBreakdown(checks),
      notionSite: /\.notion\.site$/i.test(new URL(snap.origin).hostname),
    });
  } catch (e: any) {
    return res.status(500).json({ error: `Audit failed: ${e?.message ?? 'unknown error'}` });
  }
}
