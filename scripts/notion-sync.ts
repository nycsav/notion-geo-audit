#!/usr/bin/env npx tsx
/**
 * Backend → Frontend bridge: run an audit and push the result into a
 * Notion database (the "frontend"). One row per audit run.
 *
 * Setup (one time):
 *   1. Create an integration at notion.so/my-integrations → copy the token
 *   2. In Notion, open your results database → ⋯ → Connections → add your integration
 *   3. Copy the database ID from its URL (the 32-char hex segment)
 *   4. Put both in .env:
 *        NOTION_TOKEN=ntn_xxx
 *        NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Run:  npx tsx scripts/notion-sync.ts yoursite.org
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/index.js';

// minimal .env loader (no dependency)
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* .env optional */ }

const token = process.env.NOTION_TOKEN;
const dbId = process.env.NOTION_DATABASE_ID;
const url = process.argv[2];

if (!url || !token || !dbId) {
  console.error('Usage: npx tsx scripts/notion-sync.ts <url>   (needs NOTION_TOKEN + NOTION_DATABASE_ID in .env)');
  process.exit(1);
}

const report = await audit(url);
const topFix =
  report.checks
    .filter((c) => c.status !== 'pass' && c.fix)
    .sort((a, b) => b.weight - a.weight)[0]?.fix ?? 'None — every check passes.';
const grade = report.score >= 90 ? 'A' : report.score >= 75 ? 'B' : report.score >= 55 ? 'C' : report.score >= 35 ? 'D' : 'F';

const res = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'notion-version': '2022-06-28',
  },
  body: JSON.stringify({
    parent: { database_id: dbId },
    properties: {
      Site: { title: [{ text: { content: new URL(report.origin).hostname } }] },
      Score: { number: report.score },
      Grade: { select: { name: grade } },
      'Top Fix': { rich_text: [{ text: { content: topFix.slice(0, 1900) } }] },
      Audited: { date: { start: report.generatedAt.slice(0, 10) } },
      URL: { url: report.origin },
    },
  }),
});

if (res.ok) {
  console.log(`✅ ${report.origin} → ${report.score}/100 (${grade}) synced to Notion.`);
} else {
  console.error(`❌ Notion API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
