/**
 * GET /api/representation?url=yoursite.org&engine=perplexity|claude
 * Live "how does AI describe you today" check.
 *   engine=perplexity (default) — Perplexity sonar, live web-grounded answer
 *   engine=claude               — Claude Haiku 4.5 + server-side web search tool
 * Costs real money per call, so it is rate-limited: 1 check per IP per minute
 * across both engines, soft daily cap per instance. Heavy users should run the
 * CLI with their own key.
 */
import Anthropic from '@anthropic-ai/sdk';

const lastByIp = new Map<string, number>();
let dayKey = '';
let dayCount = 0;
const DAILY_CAP = 300;

function rateLimit(req: any): string | null {
  const ip = String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (now - (lastByIp.get(ip) ?? 0) < 60_000) {
    return 'One live AI check per minute — try again in a moment.';
  }
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= DAILY_CAP) {
    return 'Daily limit for free live AI checks reached. Run it locally with your own key — see the GitHub repo.';
  }
  if (lastByIp.size > 5000) lastByIp.clear();
  lastByIp.set(ip, now);
  dayCount++;
  return null;
}

async function askPerplexity(host: string) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { status: 503, body: { error: 'Perplexity check is not configured on this deployment.' } };
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
  if (!r.ok) return { status: 502, body: { error: `Perplexity returned ${r.status}.` } };
  const data: any = await r.json();
  const answer: string = data?.choices?.[0]?.message?.content ?? '';
  const sources: string[] = (data?.citations ?? []).slice(0, 5);
  if (!answer) return { status: 502, body: { error: 'No answer came back — try again.' } };
  return { status: 200, body: { host, answer, sources, engine: 'Perplexity (sonar), live query' } };
}

async function askClaude(host: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: 'Claude check is not configured on this deployment.' } };
  }
  const client = new Anthropic();
  let messages: Anthropic.MessageParam[] = [
    { role: 'user', content: `What is ${host}? Who is behind it and what do they offer?` },
  ];
  let response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system:
      'You are testing AI-search representation. Use web search to find out how this site presents today, then answer in under 120 words, plain English. If you genuinely cannot find the entity, say so plainly — do not guess.',
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages,
  });
  // Server-side tool loop can pause; resume up to 3 times
  for (let i = 0; i < 3 && response.stop_reason === 'pause_turn'; i++) {
    messages = [...messages, { role: 'assistant', content: response.content }];
    response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });
  }
  const answer = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  const sources: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text' && block.citations) {
      for (const c of block.citations) {
        const url = (c as any).url;
        if (url && !sources.includes(url)) sources.push(url);
      }
    }
  }
  if (!answer) return { status: 502, body: { error: 'No answer came back — try again.' } };
  return { status: 200, body: { host, answer, sources: sources.slice(0, 5), engine: 'Claude (Haiku 4.5) + live web search' } };
}

export default async function handler(req: any, res: any) {
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

  const limited = rateLimit(req);
  if (limited) return res.status(429).json({ error: limited });

  const engine = String(req.query?.engine ?? 'perplexity').toLowerCase();
  try {
    const result = engine === 'claude' ? await askClaude(host) : await askPerplexity(host);
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(502).json({ error: 'The live check timed out — try again.' });
  }
}
