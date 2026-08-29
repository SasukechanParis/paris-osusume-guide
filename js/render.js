export function renderProgramList(contests) {
  return contests
    .map(
      (c) => `
    <div class="program-row">
      <div>
        <p class="program-name">${c.name}</p>
        <p class="program-meta">主催: ${c.organizer}</p>
      </div>
      <div class="program-date">${c.next_edition_date ?? '次回未発表'}<span class="status">下書き待ち</span></div>
    </div>`
    )
    .join('');
}

export function renderRankingGroups(results, shops, contests) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  return results
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const shop = shopById.get(r.shop_id);
          return `
        <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
          <span class="rank-num">${r.rank}</span>
          <div>
            <p class="ranking-shop-name">${shop.name}</p>
            <p class="ranking-arr">${shop.arrondissement}</p>
          </div>
          <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
        </div>`;
        })
        .join('');
      return `
    <div class="ranking-group">
      <p class="ranking-group-label">${contest.name}</p>
      ${rows}
    </div>`;
    })
    .join('');
}
