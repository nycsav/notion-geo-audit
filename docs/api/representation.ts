/**
 * GET /api/representation?url=yoursite.org
 * Live "how does AI describe you today" check via Perplexity (sonar).
 * Costs real money per call, so it is rate-limited: 1 check per IP per minute,
 * soft daily cap per instance. Heavy users should run the CLI with their own key.
 */
const lastByIp = new Map<string, number>();
let dayKey = '';
let dayCount = 0;
const DAILY_CAP = 300;

export default async function handler(req: any, res: any) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return res.status(503).json({ error: 'Live AI check is not configured on this deployment.' });

  const url = String(req.query?.url ?? '').trim();
  if (!url) return res.status(400).json({ error: 'Pass ?url=yoursite.org' });
  let host: string;
  try {
    let raw = url;
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    host = new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return res.status(400).json({ error: 'That does not look like a valid URL.' });
  }
  if (!host.includes('.') || host === 'localhost') {
    return res.status(400).json({ error: 'That host cannot be checked.' });
  }

  const ip = String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (now - (lastByIp.get(ip) ?? 0) < 60_000) {
    return res.status(429).json({ error: 'One live AI check per minute — try again in a moment.' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= DAILY_CAP) {
    return res.status(429).json({ error: 'Daily limit for free live AI checks reached. Run it locally with your own key — see the GitHub repo.' });
  }
  if (lastByIp.size > 5000) lastByIp.clear();
  lastByIp.set(ip, now);
  dayCount++;

  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are testing AI-search representation. Answer in under 120 words, plain English. If you genuinely do not know the entity, say so plainly — do not guess.',
          },
          { role: 'user', content: `What is ${host}? Who is behind it and what do they offer?` },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) return res.status(502).json({ error: `Perplexity returned ${r.status}.` });
    const data: any = await r.json();
    const answer: string = data?.choices?.[0]?.message?.content ?? '';
    const sources: string[] = (data?.citations ?? []).slice(0, 5);
    if (!answer) return res.status(502).json({ error: 'No answer came back — try again.' });
    return res.status(200).json({ host, answer, sources, engine: 'Perplexity (sonar), live query' });
  } catch {
    return res.status(502).json({ error: 'The live check timed out — try again.' });
  }
}
