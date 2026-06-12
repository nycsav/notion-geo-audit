/**
 * Optional Perplexity-powered "representation check":
 * asks a live AI search engine how it currently describes the site,
 * so the owner sees the gap the audit fixes.
 * Needs PERPLEXITY_API_KEY in the environment. Skipped silently if absent.
 */
export async function checkRepresentation(origin: string): Promise<string | undefined> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return undefined;

  const host = new URL(origin).hostname.replace(/^www\./, '');
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content:
              'You are testing AI-search representation. Answer in under 120 words, plain English. If you genuinely do not know the entity, say so plainly — do not guess.',
          },
          {
            role: 'user',
            content: `What is ${host}? Who is behind it and what do they offer?`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return `_(Representation check failed: Perplexity API returned ${res.status}.)_`;
    const data = (await res.json()) as any;
    const answer: string = data?.choices?.[0]?.message?.content ?? '';
    const cites: string[] = (data?.citations ?? []).slice(0, 5);
    if (!answer) return undefined;
    let out = `> ${answer.replace(/\n+/g, '\n> ')}\n>\n> — Perplexity (sonar), live query`;
    if (cites.length) out += `\n\nSources it used: ${cites.join(' · ')}`;
    return out;
  } catch {
    return undefined;
  }
}
