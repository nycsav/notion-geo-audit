# GEO Audit — https://brainstation.io

**Score: 71/100** · C — visible but under-represented in AI answers
*Generated 2026-06-12 08:44 UTC · geo-audit by [Enso Labs](https://ensolabs.ai)*

## Fix these first (highest impact at the top)

1. 🟡 **AI crawlers allowed in robots.txt** — Explicitly allow the AI engines you want to be represented in.
2. 🟡 **JSON-LD structured data (schema.org)** — Add an Organization (or Person, for an individual) JSON-LD block to your home page — this is how AI engines disambiguate you from similarly-named entities.
3. 🟡 **Definition-lead sentence (AEO)** — Open the page with one plain sentence: "brainstation.io is a [what you are] that [what you do] for [whom]." Then continue as normal.
4. 🟡 **llms.txt for AI assistants** — Add /llms.txt — a short markdown file: one-line definition of the site, then links to your most important pages with one-line descriptions.
5. 🟡 **FAQ schema** — Add a short FAQ (3–6 real questions people ask you) with FAQPage JSON-LD on a relevant page.
6. 🟡 **MCP endpoint (/.well-known/mcp.json)** — Optional frontier move: publish /.well-known/mcp.json describing your MCP server (or your contact endpoint) so agents can find the official integration.
7. 🟡 **RSS/Atom feed** — Publish an RSS/Atom feed and reference it with <link rel="alternate" type="application/rss+xml" href="/feed.xml">.

## 1 · Crawlability — can AI engines reach you?

### ✅ Site loads over HTTPS (5/5)

Home page returned HTTP 200 at https://brainstation.io.

### ✅ robots.txt present (5/5)

Found at https://brainstation.io/robots.txt.

### 🟡 AI crawlers allowed in robots.txt (8/15)

No AI crawlers are named. They default to your "*" rules — that works, but naming them is an explicit welcome signal and survives future "*" tightening.

- · unlisted — GPTBot (ChatGPT (training + search index))
- · unlisted — OAI-SearchBot (ChatGPT Search)
- · unlisted — ChatGPT-User (ChatGPT live browsing)
- · unlisted — ClaudeBot (Claude)
- · unlisted — PerplexityBot (Perplexity)
- · unlisted — Google-Extended (Gemini)
- · unlisted — Applebot-Extended (Apple Intelligence)
- · unlisted — meta-externalagent (Meta AI)
- · unlisted — Amazonbot (Alexa / Rufus)
- · unlisted — Bytespider (ByteDance / Doubao)

**Fix:** Explicitly allow the AI engines you want to be represented in.

```
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: https://brainstation.io/sitemap.xml
```

### ✅ XML sitemap present and declared (8/8)

Sitemap at https://brainstation.io/sitemap.xml, declared in robots.txt.

### 🟡 llms.txt for AI assistants (4/8)

No llms.txt. This emerging standard gives AI assistants a curated, plain-text map of who you are and your best pages.

**Fix:** Add /llms.txt — a short markdown file: one-line definition of the site, then links to your most important pages with one-line descriptions.

```
# brainstation.io

> One sentence that defines who you are and what you do.

## Key pages

- [About](https://brainstation.io/about): Who we are
- [Services](https://brainstation.io/services): What we offer
- [Contact](https://brainstation.io/contact): How to reach us
```

## 2 · Structure — can they understand who you are?

### 🟡 JSON-LD structured data (schema.org) (8/15)

1 JSON-LD block(s); types: School; no identity type (Organization/Person/WebSite).

- ✓ School

**Fix:** Add an Organization (or Person, for an individual) JSON-LD block to your home page — this is how AI engines disambiguate you from similarly-named entities.

```
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Name",
  "url": "https://brainstation.io",
  "description": "One sentence that defines you.",
  "sameAs": [
    "https://www.linkedin.com/company/yourname",
    "https://github.com/yourname"
  ]
}
</script>
```

### ✅ Canonical URL (5/5)

Canonical set: https://brainstation.io/.

### ✅ Open Graph tags (5/5)

og:title, og:description, og:image, og:url all present.

### ✅ Title and meta description (5/5)

Title (51 chars) and meta description (83 chars) present.

### ✅ Page is indexable (no noindex) (5/5)

No restrictive robots meta tag.

## 3 · Content — is your writing quotable in an answer?

### ✅ Single clear H1 (4/4)

H1: "Skills for the AI Economy"

### 🟡 Definition-lead sentence (AEO) (5/10)

No "X is a …" definition found in the first screen of text. AI engines favor pages that define their subject in one quotable sentence.

**Fix:** Open the page with one plain sentence: "brainstation.io is a [what you are] that [what you do] for [whom]." Then continue as normal.

### 🟡 FAQ schema (3/6)

No FAQPage schema on the home page. FAQs are the most directly quotable format for AI answers.

**Fix:** Add a short FAQ (3–6 real questions people ask you) with FAQPage JSON-LD on a relevant page.

## 4 · Connectivity — feeds and agent access

### 🟡 RSS/Atom feed (2/4)

No feed found. Feeds are the cheapest way to push fresh content to aggregators and AI crawlers.

**Fix:** Publish an RSS/Atom feed and reference it with <link rel="alternate" type="application/rss+xml" href="/feed.xml">.

### 🟡 MCP endpoint (/.well-known/mcp.json) (3/5)

No MCP manifest. Optional, but it is the emerging way for AI agents to discover a site's official connector.

**Fix:** Optional frontier move: publish /.well-known/mcp.json describing your MCP server (or your contact endpoint) so agents can find the official integration.

```
{
  "name": "brainstation.io",
  "description": "One sentence about this site.",
  "url": "https://brainstation.io",
  "contact": "hello@brainstation.io"
}
```

---

*GEO = Generative Engine Optimization: being reachable, understandable, and quotable for AI search engines (ChatGPT, Claude, Perplexity, Gemini). This audit checks public signals only — no login, no API keys, no tracking.*