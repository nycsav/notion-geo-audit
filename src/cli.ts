#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { audit, toMarkdown, toTerminal, checkRepresentation } from './index.js';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('-'));
const mdFlag = args.indexOf('--md');
const mdPath = mdFlag !== -1 ? args[mdFlag + 1] : undefined;
const wantRepresentation = args.includes('--representation');
const jsonOut = args.includes('--json');

if (!url) {
  console.log(`
geo-audit — free GEO (Generative Engine Optimization) audit. No API keys needed.

Usage:
  geo-audit <url>                      quick terminal scorecard
  geo-audit <url> --md report.md       full markdown report with copy-paste fixes
  geo-audit <url> --json               raw JSON (for pipelines/agents)
  geo-audit <url> --representation     also ask Perplexity how AI describes you
                                       (optional; needs PERPLEXITY_API_KEY)

What it checks: robots.txt AI-crawler policy, llms.txt, sitemap, JSON-LD identity,
canonical/OG/meta tags, definition-lead writing, FAQ schema, RSS, MCP manifest.
`);
  process.exit(1);
}

const report = await audit(url);
const representation = wantRepresentation ? await checkRepresentation(report.origin) : undefined;

if (jsonOut) {
  console.log(JSON.stringify({ ...report, representation }, null, 2));
} else {
  console.log(toTerminal(report));
  if (representation) {
    console.log('  How AI describes you today:\n');
    console.log(
      representation
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n'),
    );
    console.log('');
  }
}

if (mdPath) {
  writeFileSync(mdPath, toMarkdown(report, { representation }));
  console.log(`  Markdown report written to ${mdPath}\n`);
}
