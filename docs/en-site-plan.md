# English site (`/en/`) — plan and decisions

Created: 2026-09-11. This documents the English-language section of the site: why it exists, how it differs from the Japanese site, what was built, and what's still open. Written as the client (Sasuke) was asleep and asked to proceed as far as possible without stopping for approval, except for anything irreversible — see "What was NOT done" at the bottom for the one thing deliberately left for his review.

## Why this is not a translation

The Japanese site (`/`, root) is a closed, practical guide for Sasuke Photography's own clients — deliberately `noindex`, not distributed publicly, written assuming a Japanese-speaking, often first-time-to-Paris audience.

The English site (`/en/`) is a different product with a different purpose: a public, SEO-optimized Paris guide aimed at English-speaking travelers (US/UK/Canada/Australia/Singapore/Hong Kong/Europe), especially couples, honeymooners, and first-time visitors — built to (1) genuinely help that reader, (2) earn hotel-affiliate revenue over time, and (3) eventually connect to Sasuke Photography's English site once that exists. It reuses the Japanese site's underlying research where it's genuinely factual and public, but restructures, expands, and in several places writes entirely new content aimed at what English-speaking travelers actually search for (see the worked "dining" example in the original brief — this is exactly what `dining-in-paris.html` does: not a translated "how do you ask for water," but tipping/splitting the bill/three courses/booking/dinner timing/service-style differences as one connected answer).

## Content classification (what could/couldn't be reused)

Every piece of existing site content was sorted into one of four buckets before anything was ported:

- **PUBLIC** — official/public factual data: the baguette & croissant competition results (`data/contests.json`/`results.json`/`shops.json`), Michelin-starred restaurant list (`data/michelin.json`, factual fields only), the practical-guide content in `guide.html`/`emergency.html`/`airport.html` (dining etiquette, tipping law, metro, détaxe, luggage, emergency numbers — all already sourced to official links on the Japanese site). **Ported and expanded.**
- **OWNER_APPROVAL** — Sasuke's own opinions/experience not yet cleared for public reuse. The clearest case: the 7 hotels in `data/recommendations.json`'s `hotel` category are Sasuke's personal picks, but chosen for a different mix of criteria (atmosphere/staff/value/cleanliness) than the location-first method this plan requires, and were never confirmed for public reuse. **Decision: did not port them.** The English hotel list was built fresh from independent public research instead (see `hotels.html`). If Sasuke wants specific ones added back in with his own voice, that's a follow-up, not something guessed at here.
- **CLIENT_PRIVATE** — `data/guest-recommendations.json` (recommendations from past wedding-shoot clients). **Never read for content, never referenced, not used anywhere on `/en/`.** This is the one rule treated as absolute throughout this project.
- **DO_NOT_TRANSLATE** — `shoot-day.html` (booking-client-only shoot-day logistics) and anything specific to Japanese travelers (e.g. the in-app Japanese embassy phone number in `emergency.html`, JP-audience celebrity-sighting notes). Not relevant to a general English audience; skipped entirely. The tipping FAQ's JP-only note about bringing cash for a café terrace shoot was also dropped from the English tipping answer — that's shoot-logistics advice, not general tipping advice.

## URL structure

- English pages live flat under `/en/*.html` (e.g. `/en/hotels.html`), mirroring the existing site's flat structure (no subfolders) for consistency.
- `robots.txt` was changed from a blanket `Disallow: /` to `Disallow: /` + `Allow: /en/` — the Japanese site's noindex/private posture is untouched; only `/en/` is opened up. A new `sitemap-en.xml` (English URLs only) is referenced from `robots.txt`.
- No `hreflang` tags were added. Reasoning: hreflang is meant to link true page-for-page equivalents, and it's generally ignored by Google unless reciprocal — the Japanese pages are `noindex` and mostly not 1:1 equivalents to how the English content is split up (e.g. one Japanese `guide.html` maps to six English pages). Canonical + `lang="en"` + `og:locale` is the correct, simpler choice here. If a true 1:1 page pair is ever built, hreflang can be added between that specific pair later.
- No existing Japanese file's content, publishing policy, or `noindex` meta was touched — only `robots.txt` (additive) and new files under `/en/`, plus one new shared stylesheet `css/en.css` (never edits `tokens.css`/`base.css`/`style.css`, which the Japanese pages depend on).

## Site map (pages built)

| Page | Purpose / primary SEO target |
|---|---|
| `en/index.html` | Home — orientation, not a shoot-day-oriented "what do you want to do" menu like the JP homepage |
| `en/about.html` | Who writes this, hotel-selection method, affiliate disclosure |
| `en/practical-guide.html` | Hub for the six pages below |
| `en/dining-in-paris.html` | "How dining in Paris actually works" — water/tipping/splitting bill/courses/booking/timing/service style (FAQPage schema) |
| `en/getting-around-paris.html` | Metro apps & tickets, pickpocket/phone-theft reality check, public toilets, luggage storage |
| `en/paris-opening-hours.html` | Sunday/Monday closures, museum closing days incl. Pompidou's multi-year closure, 2026 public holidays |
| `en/money-and-tax-free-shopping.html` | Wise/Revolut card-fee avoidance, détaxe/PABLO step-by-step (the airport step people forget) |
| `en/emergency-guide.html` | 13 emergency scenarios, France-specific numbers, nationality-agnostic (no single embassy hardcoded) |
| `en/airport-transfers.html` | CDG/Orly/Beauvais, all modes, 2026 fares, taxi-scam warning |
| `en/paris-bakery-awards.html` | Hub for the official bread-competition content — the site's most differentiated asset |
| `en/best-baguettes-in-paris.html` | Grand Prix de la Meilleure Baguette de Paris results |
| `en/best-croissants-in-paris.html` | Meilleur Croissant au Beurre du Grand Paris results |
| `en/michelin-star-restaurants-paris.html` | Paris's 2/3-star Michelin restaurants |
| `en/hotels.html` | Location-first hotel picks by category, affiliate-ready |
| `en/paris-honeymoon-guide.html` | Romantic Paris / honeymoon / proposal & sunrise spots / couples itinerary / photoshoot styling |

All 15 pages above are complete, tested locally (rendered, no console errors, all internal links resolve — see "Testing done" below), and use only PUBLIC or independently-researched content per the classification above.

**Hotels selected** (`en/hotels.html`, 16 total, each with a stated location rationale and 2 independent sources): Hôtel Regina Louvre, Le Meurice, Hôtel du Louvre (Unbound Collection by Hyatt), Hôtel Thérèse, Cheval Blanc Paris, Hôtel Lutetia, Hôtel Bel-Ami, Relais Christine, Shangri-La Paris, Pullman Paris Tour Eiffel, Hôtel Duquesne Eiffel, Le Pavillon de la Reine, Hôtel du Petit Moulin, Hôtel Jules & Jim, Airelles Château de Versailles (Le Grand Contrôle), Molitor Hotel & Spa Paris. The last two are the "destination hotel" exception category.

## Hotel affiliate design

`en/data/hotels-en.json` holds structured hotel objects with `affiliateLinks: { expedia, hotelsCom, booking, agoda }`, each left as an **empty string** — no accounts exist yet. `en/js/hotels-en.js` renders a card per hotel and only outputs an affiliate button for a link that is actually non-empty; with everything empty today, no affiliate button renders at all (not a disabled one — nothing). A disclosure banner ("This page may contain affiliate links...") sits above the hotel list. Click tracking is wired to GoatCounter's `data-goatcounter-click="hotel_affiliate_click"` convention so it's ready the moment a real link is added.

**What you need to fill in later, in one place:** open `en/data/hotels-en.json`, find the hotel, and paste the tracked affiliate URL into the relevant field (`expedia`/`hotelsCom`/`booking`/`agoda`). The button appears automatically; no other file needs to change.

## Future photography cross-link

`en/assets/config.js` holds `photographerWebsiteUrl: ''` as the single place this gets turned on. Every page that could reasonably carry a "Planning a couples photoshoot in Paris?" CTA has an HTML comment placeholder (search the repo for `Future CTA`) instead of live markup — nothing links out today. When the English Sasuke Photography site exists: set the URL in `config.js`, then replace each `<!-- Future CTA: ... -->` comment with real markup (View portfolio / Book a shoot), and consider adding hreflang/hub-page cross-links at that point too.

## Analytics

English pages use a **separate GoatCounter site code**, `paris-guide-en`, from the Japanese site's `paris-osusume` — so English SEO traffic and hand-distributed Japanese client traffic never mix in the dashboard. **This needs the same one-time signup step the Japanese site needed**: sign up at goatcounter.com with site code `paris-guide-en`, confirm via email, then `https://paris-guide-en.goatcounter.com/` will start showing data (it's already embedded in every English page, so nothing else needs to change once the account exists).

## Testing done

- Every English page was loaded in a real browser against a local static server; no console errors, all fonts/CSS/images/data loaded (200 OK).
- A script checked every relative `href`/`src` across all 15 English pages — 0 broken internal links.
- The existing Japanese-site test suite (`node --test`, 49 tests covering rendering logic) was re-run after all changes: still 49/49 passing, confirming nothing in `css/tokens.css`, `css/base.css`, `css/style.css`, or any `data/*.json` file was altered.
- Grepped the entire `en/` tree for banned first-person/attribution phrases ("I recommend," "Sasuke recommends," "my clients love," etc.), any reference to `guest-recommendations.json`, and any non-empty/placeholder affiliate URL — all clean.
- Spot-verified two specific factual claims myself via live web search rather than trusting either my own or the subagents' training-data knowledge: that the baguette competition's winner genuinely does supply the Élysée Palace for a year (confirmed, multiple outlets including 2026's actual winner), and that Paris's free public "sanisette" toilets are officially ~435 in number per paris.fr (used that instead of the Japanese site's older 581-count snapshot, which was itself flagged there as a static, non-refreshed figure).

## What was deliberately left out of v1 (not fabricated, just not attempted tonight)

- A rebuilt English interactive map (`map.html` equivalent) — the Japanese Leaflet map has Japanese-language UI controls; porting it well is a real feature, not a translation, and was out of scope for one night.
- An English "find the nearest bakery/hotel to me" GPS search — nice-to-have, not required for the content to be useful or correct.
- Chocolatiers/bakeries/souvenirs/supermarket category pages — the Japanese equivalents mix Sasuke's own picks (OWNER_APPROVAL, needs his confirmation before public reuse) with guest picks (CLIENT_PRIVATE, excluded entirely) and needed the same location/fact-driven independent-research treatment as hotels. Left for a follow-up rather than rushed.
- One-star Michelin restaurants (98 of the 127) — intentionally shown as "see the official guide" rather than listed with unverified one-line blurbs; matches the reasoning already used for the Japanese site.

## What was NOT done — the one item held back for review

Everything above was built and saved to the local git working copy, but **nothing was pushed to `origin`/GitHub, and nothing is live.** `git push` publishes immediately (GitHub Pages auto-deploys on push to `main`) to a real public repository search engines can already reach — that's the one action in this whole project that isn't cleanly reversible (once Google or an AI crawler indexes something wrong, walking it back takes real time), and several pages here (hotel picks, prices, emergency numbers) are exactly the kind of factual claims this project's own brief said must never go out unverified. Review the summary in chat, spot-check anything that concerns you, and this is ready for `git add`/`commit`/`push` on your word.
