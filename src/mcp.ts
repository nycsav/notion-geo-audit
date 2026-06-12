#!/usr/bin/env node
/**
 * geo-audit as an MCP server — the "GEO connector".
 * Add it to Claude (Desktop, Code, or claude.ai) and any community member can ask:
 *   "Audit mysite.org for AI visibility and tell me what to fix first."
 *
 * Claude Code:  claude mcp add geo-audit -- npx -y geo-audit-mcp
 * (or locally:  claude mcp add geo-audit -- npx tsx /path/to/geo-audit/src/mcp.ts)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audit, toMarkdown, checkRepresentation } from './index.js';

// Load a sibling .env (gitignored) so the optional Perplexity key never has to
// live in MCP client config. Real env vars win over the file.
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* no .env — representation check simply stays off */
}

const server = new McpServer({ name: 'geo-audit', version: '0.1.0' });

server.tool(
  'audit_site',
  'Run a GEO (Generative Engine Optimization) audit on a public website. Checks AI-crawler access, llms.txt, structured data, answer-ready content, and agent connectivity. Returns a scored markdown report with copy-paste fixes. No API keys needed.',
  { url: z.string().describe('The website to audit, e.g. https://example.com or just example.com') },
  async ({ url }) => {
    const report = await audit(url);
    return { content: [{ type: 'text', text: toMarkdown(report) }] };
  },
);

server.tool(
  'check_ai_representation',
  'Ask a live AI search engine (Perplexity) how it currently describes a website/brand, with the sources it used. Requires PERPLEXITY_API_KEY in the environment.',
  { url: z.string().describe('The website to check, e.g. https://example.com') },
  async ({ url }) => {
    const origin = url.startsWith('http') ? url : `https://${url}`;
    const rep = await checkRepresentation(new URL(origin).origin);
    return {
      content: [
        {
          type: 'text',
          text: rep ?? 'Representation check unavailable (set PERPLEXITY_API_KEY to enable it).',
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
