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

## Round 2 (same day, site owner reviewed round 1 and asked for more)

After reviewing the first 15 pages, Sasuke asked for four more things, all now built:

1. **Restaurant/café, chocolatier/pâtisserie, bakery, and souvenir pages ported from his own picks** — he explicitly approved reusing `data/recommendations.json` for these categories (a different ruling from hotels: no criteria mismatch here, these just are his real picks). `data/guest-recommendations.json` is still never touched, no exception. See the new pages listed below.
2. **Michelin page expanded from 29 to all 127 entries** (one/two/three star), with arrondissement + cuisine filters added alongside the existing star filter, and a "find nearest" search. The French→English cuisine-label table lives in `en/js/michelin-en.js`.
3. **An interactive map** (`en/map.html`, Leaflet + OpenStreetMap, porting `map.js`'s approach) aggregating pins from every English-only data source — bread-contest winners, all 127 Michelin entries, hotels, and (once built) the four new category pages — with category/area filters, address search, and a "show my location" control, mirroring the Japanese site's `map.html` feature-for-feature but in English. Built to degrade gracefully: it fetches the four new category files with a helper that treats a missing file as "no pins yet" rather than breaking, so the map works today and picks up new categories automatically as they land — no code change needed later.
4. **Hotels now have coordinates.** The original hotel brief didn't ask for lat/lng, so `en/data/hotels-en.json` didn't have any — added by geocoding all 16 addresses via Nominatim (same tool and method the Japanese site already uses), so hotels can appear on the new map. Each result was sanity-checked against a Paris/Île-de-France bounding box before being accepted; none needed manual correction.

Also answered two operational questions in chat rather than in a page: whether hotel-affiliate signups require a registered French business (no, for signup; yes in principle once real commission income starts — added detail to `wiki/ビジネス設計/フランス起業_税務_生活実務_wiki.md`), and the GoatCounter signup steps for the new `paris-guide-en` site code.

### Final site map (19 pages total)

Added since round 1: `en/restaurants-and-cafes-paris.html`, `en/chocolatiers-and-patisseries-paris.html`, `en/favorite-bakeries-paris.html`, `en/paris-souvenir-guide.html`, `en/map.html`. `paris-bakery-awards.html` now also hubs these four new "Sasuke's own picks" pages alongside the two competitions and Michelin. The top nav's second item was renamed "Bakery Awards" → "Food & Drink" and a "Map" item was added, applied consistently across all 19 pages (section-grouped active states: every practical-guide sub-page highlights "Practical Guide," every food/bakery/restaurant/Michelin page highlights "Food & Drink").

### Map data resilience (worth knowing if you edit this later)

`en/js/map-en.js` loads the four "Sasuke's own picks" JSON files with a helper (`fetchJsonOrEmpty`) that treats a missing file as zero pins rather than an error — this was deliberate, since the map was built before those four pages existed and needed to keep working either way. Now that all four exist, this no longer matters in practice, but the pattern is still there if a category ever gets removed or renamed.

## Testing done

- Every English page was loaded in a real browser against a local static server; no console errors, all fonts/CSS/images/data loaded (200 OK).
- A script checked every relative `href`/`src` across all 15 English pages — 0 broken internal links.
- The existing Japanese-site test suite (`node --test`, 49 tests covering rendering logic) was re-run after all changes: still 49/49 passing, confirming nothing in `css/tokens.css`, `css/base.css`, `css/style.css`, or any `data/*.json` file was altered.
- Grepped the entire `en/` tree for banned first-person/attribution phrases ("I recommend," "Sasuke recommends," "my clients love," etc.), any reference to `guest-recommendations.json`, and any non-empty/placeholder affiliate URL — all clean.
- Spot-verified two specific factual claims myself via live web search rather than trusting either my own or the subagents' training-data knowledge: that the baguette competition's winner genuinely does supply the Élysée Palace for a year (confirmed, multiple outlets including 2026's actual winner), and that Paris's free public "sanisette" toilets are officially ~435 in number per paris.fr (used that instead of the Japanese site's older 581-count snapshot, which was itself flagged there as a static, non-refreshed figure).

## What was deliberately left out (still true after round 2)

- **`supermarket` category** — zero entries in the Japanese site's own data (`data/recommendations.json`), so there's nothing to port yet.
- **Flea markets / free spots (passages, free museums, public toilets as their own page)** — not built. The interactive map and the "public toilets" section in `getting-around-paris.html` cover the highest-value parts of this; a full English port of `flea-markets.html`/`free-spots.html` would need the same care the rest of this project got, and wasn't requested.
- **Photo display on category cards** — `photo_url` is `null` for every entry in the current data, so no image-rendering code was built for restaurant/hotel/bakery cards; trivial to add once real photos exist.
- **"Trending now" (`今話題のこと`)** — not ported. It's Japan-audience social-media buzz-driven content on the Japanese site and would need its own English-market research process, not a translation.

## What was NOT done — the one item held back for review

Everything above was built and saved to the local git working copy, but **nothing was pushed to `origin`/GitHub, and nothing is live.** `git push` publishes immediately (GitHub Pages auto-deploys on push to `main`) to a real public repository search engines can already reach — that's the one action in this whole project that isn't cleanly reversible (once Google or an AI crawler indexes something wrong, walking it back takes real time), and several pages here (hotel picks, prices, emergency numbers) are exactly the kind of factual claims this project's own brief said must never go out unverified. Review the summary in chat, spot-check anything that concerns you, and this is ready for `git add`/`commit`/`push` on your word.
