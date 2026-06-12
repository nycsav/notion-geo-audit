import { takeSnapshot } from './snapshot.js';
import { runChecks } from './checks.js';
import { buildReport, toMarkdown, toTerminal } from './report.js';
import { checkRepresentation } from './representation.js';
import type { AuditReport } from './types.js';

export { takeSnapshot, runChecks, buildReport, toMarkdown, toTerminal, checkRepresentation };
export type { AuditReport };

/** One-call audit: fetch → check → score. */
export async function audit(url: string): Promise<AuditReport> {
  const snap = await takeSnapshot(url);
  return buildReport(snap.origin, runChecks(snap));
}
