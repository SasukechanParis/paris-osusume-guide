// Single source of truth for values that will be filled in later.
// Do not hardcode these values anywhere else in the English site.
export const siteConfig = {
  siteName: 'Paris Guide by Sasuke',
  baseUrl: 'https://sasukechanparis.github.io/paris-osusume-guide/en/',

  // Sasuke Photography's English site is not live yet.
  // Once it is, set this URL and the photography CTAs (currently left as
  // HTML comments on each page, search for "Future CTA") can be uncommented.
  photographerWebsiteUrl: '',

  // Only approved, modest bio line — do not expand into marketing copy
  // without explicit sign-off (see docs/en-site-plan.md).
  photographerBio: 'Created by Sasuke, a Paris-based wedding and couple photographer.',

  // GoatCounter site code is separate from the Japanese site's so stats
  // don't mix. Needs a one-time signup at goatcounter.com (same step as
  // the JP site) before it starts recording.
  goatcounterUrl: 'https://paris-guide-en.goatcounter.com/count',

  affiliateDisclosure:
    "This page may contain affiliate links. If you book through one of them, I may earn a small commission at no extra cost to you. Hotels are selected independently based on location and guest experience — never on commission.",
};
