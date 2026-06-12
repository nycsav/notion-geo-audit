# geo-audit — 5-minute community demo script

**Audience:** community forum / meetup members who own a site (business, portfolio, nonprofit).
**Setup:** terminal open in this repo, `npm install` done. Optional: `PERPLEXITY_API_KEY` in `.env` for the representation twist.

---

**1. Hook (30s)**
"Google has SEO. AI search has GEO — Generative Engine Optimization — and almost nobody is checking it. When someone asks ChatGPT or Perplexity about what you do, either you're in the answer or your competitor is. Let's check this venue right now."

```bash
npx tsx src/cli.ts <venue-or-local-site>
```
→ A real score appears in ~10 seconds. Room reacts.

**2. The reference (30s)**
```bash
npx tsx src/cli.ts ensolabs.ai
```
→ 100/100. "This isn't magic — it's 15 public checks. We did them on our own site first, then open-sourced the checklist."

**3. The twist (60s)**
```bash
npx tsx src/cli.ts ensolabs.ai --representation
```
→ Perplexity describes the brand live — and may cite a similarly-named company first.
"A perfect technical score still doesn't mean AI describes **you** correctly. You have to check. Now you can."

**4. Their turn (2 min)**
Volunteer shouts their URL:
```bash
npx tsx src/cli.ts theirsite.org --md theirsite-report.md
```
Open the report. Show the "Fix these first" list and one copy-paste snippet (usually the robots.txt AI block or llms.txt template). Hand them the file.

**5. Close (30s)**
"Free, MIT-licensed, and it runs inside Claude as a connector — add it once and just ask *'audit my site and walk me through the fixes.'* Own your representation."
— *Powered by Enso Labs · ensolabs.ai*

---

## Workshop format (45 min)
- 10 min: the 4 pillars, why AI visibility ≠ SEO
- 20 min: everyone audits their own site, compares scores
- 10 min: each person picks their top 3 fixes, applies the first one live
- 5 min: re-audit, watch the score move
