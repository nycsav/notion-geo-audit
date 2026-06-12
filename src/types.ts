export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';

export interface CheckResult {
  /** Stable id, e.g. "robots-ai-bots" */
  id: string;
  /** Human title, e.g. "AI crawlers allowed in robots.txt" */
  title: string;
  /** Which pillar this belongs to */
  pillar: 'crawlability' | 'structure' | 'content' | 'connectivity';
  status: CheckStatus;
  /** Max points this check contributes to the score */
  weight: number;
  /** Points earned (0..weight) */
  earned: number;
  /** One-line finding in plain English */
  finding: string;
  /** Plain-English fix; empty when status is pass */
  fix?: string;
  /** Optional copy-paste snippet for the fix */
  snippet?: string;
  /** Extra detail lines (evidence) */
  details?: string[];
}

export interface SiteSnapshot {
  /** Normalized origin, e.g. https://example.com */
  origin: string;
  /** The URL actually audited (after redirects) */
  finalUrl: string;
  /** Home page HTML ('' if unreachable) */
  html: string;
  /** Home page HTTP status (0 = network failure) */
  status: number;
  robotsTxt: TextProbe;
  llmsTxt: TextProbe;
  sitemap: TextProbe;
  mcpManifest: TextProbe;
  /** RSS/Atom feed — location discovered via <link> tag or common paths */
  feed: TextProbe & { discoveredVia?: string };
}

export interface TextProbe {
  url: string;
  status: number;
  ok: boolean;
  body: string;
}

export interface AuditReport {
  origin: string;
  generatedAt: string;
  score: number;
  maxScore: number;
  grade: string;
  checks: CheckResult[];
}
