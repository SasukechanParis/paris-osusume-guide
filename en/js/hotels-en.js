// Renders /en/hotels.html from en/data/hotels-en.json.
// Self-contained: no dependency on the Japanese site's js/data.js or
// js/render.js, since this is a separate, English-only surface.

const SECTIONS = [
  { category: 'first-time-visitors', id: 'first-time-visitors', title: 'Best hotels for first-time visitors' },
  { category: 'couples', id: 'couples', title: 'Best hotels for couples' },
  { category: 'honeymoon', id: 'honeymoon', title: 'Best honeymoon hotels' },
  { category: 'near-louvre', id: 'near-louvre', title: 'Best hotels near the Louvre' },
  { category: 'saint-germain', id: 'saint-germain', title: 'Best hotels in Saint-Germain-des-Prés' },
  { category: 'eiffel-tower', id: 'eiffel-tower', title: 'Best hotels near the Eiffel Tower' },
  { category: 'le-marais', id: 'le-marais', title: 'Best hotels in Le Marais' },
  { category: 'destination', id: 'destination', title: "Hotels worth traveling for" }
];

const AFFILIATE_LABELS = {
  expedia: 'Expedia',
  hotelsCom: 'Hotels.com',
  booking: 'Booking.com',
  agoda: 'Agoda'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadHotels() {
  const res = await fetch('data/hotels-en.json');
  if (!res.ok) throw new Error(`Failed to load hotels-en.json: ${res.status}`);
  return res.json();
}

function renderTags(tags) {
  if (!tags || !tags.length) return '';
  const chips = tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('');
  return `<div class="tag-row">${chips}</div>`;
}

// Only renders a row (and only the buttons within it) for affiliate links
// that are actually set. When every link is an empty string — the current
// reality, since no affiliate accounts exist yet — this returns an empty
// string and no .affiliate-row element is emitted at all, not even an
// empty or disabled one.
function renderAffiliateRow(affiliateLinks) {
  if (!affiliateLinks) return '';
  const buttons = Object.entries(affiliateLinks)
    .filter(([, url]) => typeof url === 'string' && url.trim() !== '')
    .map(([key, url]) => {
      const label = AFFILIATE_LABELS[key] || key;
      return `<a class="btn btn-outline" href="${escapeHtml(url)}" data-goatcounter-click="hotel_affiliate_click" target="_blank" rel="noopener sponsored">${escapeHtml(label)}</a>`;
    });
  if (!buttons.length) return '';
  return `<div class="affiliate-row">${buttons.join('')}</div>`;
}

function renderHotelCard(hotel) {
  const parts = [
    `<p class="hotel-card-name">${escapeHtml(hotel.name)}</p>`,
    `<p class="hotel-card-area">${escapeHtml(hotel.arrondissement)} — <a href="${escapeHtml(hotel.googleMapsUrl)}" target="_blank" rel="noopener">${escapeHtml(hotel.address)}</a></p>`,
    renderTags(hotel.tags),
    `<p class="hotel-card-why">${escapeHtml(hotel.whyThisLocation)}</p>`,
    renderAffiliateRow(hotel.affiliateLinks)
  ];
  return `<div class="hotel-card">${parts.join('')}</div>`;
}

function renderSection(section, hotels) {
  const matches = hotels.filter((hotel) => hotel.categories && hotel.categories.includes(section.category));
  if (!matches.length) return '';
  const cards = matches.map(renderHotelCard).join('');
  return `
    <section aria-labelledby="${section.id}-h">
      <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="${section.id}-h">${escapeHtml(section.title)}</h2></div>
      <div class="hotel-grid">${cards}</div>
    </section>
  `;
}

function renderJumpNav() {
  const links = SECTIONS.map((section) => `<a href="#${section.id}-h">${escapeHtml(section.title)}</a>`).join('');
  return `<nav class="jump-nav" aria-label="Jump to a hotel category">${links}</nav>`;
}

export async function initHotelsPage() {
  const jumpNavTarget = document.getElementById('hotels-jump-nav');
  const sectionsTarget = document.getElementById('hotels-sections');
  if (!jumpNavTarget || !sectionsTarget) return;

  try {
    const hotels = await loadHotels();
    jumpNavTarget.innerHTML = renderJumpNav();
    sectionsTarget.innerHTML = SECTIONS.map((section) => renderSection(section, hotels)).join('');
  } catch (err) {
    sectionsTarget.innerHTML = '<p class="trending-desc">Hotel list is temporarily unavailable. Please try again shortly.</p>';
    console.error(err);
  }

  if (window.goatcounter && window.goatcounter.bind_events) {
    window.goatcounter.bind_events();
  }
}

initHotelsPage();
