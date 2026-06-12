import type { AuditReport, CheckResult } from './types.js';

export function buildReport(origin: string, checks: CheckResult[]): AuditReport {
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + c.earned, 0);
  const pct = Math.round((score / maxScore) * 100);
  const grade =
    pct >= 90 ? 'A — AI engines can see, understand, and cite you'
    : pct >= 75 ? 'B — solid foundation, a few high-leverage gaps'
    : pct >= 55 ? 'C — visible but under-represented in AI answers'
    : pct >= 35 ? 'D — AI engines are mostly guessing about you'
    : 'F — effectively invisible to AI search';
  return {
    origin,
    generatedAt: new Date().toISOString(),
    score: pct,
    maxScore: 100,
    grade,
    checks,
  };
}

const ICON: Record<string, string> = { pass: '✅', warn: '🟡', fail: '🔴', skip: '⚪' };
const PILLARS: Record<string, string> = {
  crawlability: '1 · Crawlability — can AI engines reach you?',
  structure: '2 · Structure — can they understand who you are?',
  content: '3 · Content — is your writing quotable in an answer?',
  connectivity: '4 · Connectivity — feeds and agent access',
};

export function toMarkdown(report: AuditReport, opts?: { representation?: string }): string {
  const lines: string[] = [];
  lines.push(`# GEO Audit — ${report.origin}`);
  lines.push('');
  lines.push(`**Score: ${report.score}/100** · ${report.grade}`);
  lines.push(`*Generated ${report.generatedAt.slice(0, 16).replace('T', ' ')} UTC · geo-audit by [Enso Labs](https://ensolabs.ai)*`);
  lines.push('');

  // Top fixes first — the part a busy owner actually reads
  const fixes = report.checks
    .filter((c) => c.status !== 'pass' && c.fix)
    .sort((a, b) => b.weight - a.weight);
  if (fixes.length) {
    lines.push('## Fix these first (highest impact at the top)');
    lines.push('');
    fixes.forEach((c, i) => {
      lines.push(`${i + 1}. ${ICON[c.status]} **${c.title}** — ${c.fix}`);
    });
    lines.push('');
  } else {
    lines.push('## Nothing critical to fix — this site is AI-ready. 🎉');
    lines.push('');
  }

  if (opts?.representation) {
    lines.push('## How AI engines describe you today');
    lines.push('');
    lines.push(opts.representation.trim());
    lines.push('');
  }

  for (const pillar of ['crawlability', 'structure', 'content', 'connectivity'] as const) {
    const group = report.checks.filter((c) => c.pillar === pillar);
    if (!group.length) continue;
    lines.push(`## ${PILLARS[pillar]}`);
    lines.push('');
    for (const c of group) {
      lines.push(`### ${ICON[c.status]} ${c.title} (${c.earned}/${c.weight})`);
      lines.push('');
      lines.push(c.finding);
      if (c.details?.length) {
        lines.push('');
        c.details.forEach((d) => lines.push(`- ${d}`));
      }
      if (c.status !== 'pass' && c.fix) {
        lines.push('');
        lines.push(`**Fix:** ${c.fix}`);
      }
      if (c.snippet) {
        lines.push('');
        lines.push('```');
        lines.push(c.snippet);
        lines.push('```');
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('*GEO = Generative Engine Optimization: being reachable, understandable, and quotable for AI search engines (ChatGPT, Claude, Perplexity, Gemini). This audit checks public signals only — no login, no API keys, no tracking.*');
  return lines.join('\n');
}

export function toTerminal(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`  GEO AUDIT  ${report.origin}`);
  lines.push(`  Score ${report.score}/100 — ${report.grade}`);
  lines.push('');
  for (const c of report.checks) {
    lines.push(`  ${ICON[c.status]}  ${c.title.padEnd(44)} ${String(c.earned).padStart(2)}/${c.weight}`);
  }
  lines.push('');
  const fixes = report.checks.filter((c) => c.status !== 'pass' && c.fix);
  if (fixes.length) {
    lines.push(`  Top fix: ${fixes.sort((a, b) => b.weight - a.weight)[0].fix}`);
    lines.push(`  Full report with copy-paste fixes: add --md report.md`);
  }
  lines.push('');
  return lines.join('\n');
}
