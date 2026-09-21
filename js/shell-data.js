// 日本語版の共通シェル(上部バー・下部タブ・メニュー)の唯一の定義。
// scripts/apply-shell.mjs がここから各ページの静的ブロックを生成し、
// tests/shell.test.js が全ページとの同期を検証する。ナビを変えるときはここだけを編集する。

export const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  map: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  bookmark: '<path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};

// まだ使えない機能は載せない。実装した段階でここに足す。
export const TABS = [
  { id: 'home', label: 'ホーム', href: 'index.html', icon: 'home' },
  { id: 'find', label: '探す', href: 'search.html', icon: 'search' },
  { id: 'map', label: '地図', href: 'map.html', icon: 'map' },
  { id: 'saved', label: '保存', href: 'saved.html', icon: 'bookmark', badge: true },
  { id: 'menu', label: 'メニュー', href: 'menu.html', icon: 'menu' }
];

export const SOS = { label: '困ったとき', href: 'emergency.html' };

// ページ → アクティブにするタブ(SOSページは 'sos')
export const PAGE_TAB = {
  'index.html': 'home',
  'map.html': 'map',
  'toilets-map.html': 'map',
  'search.html': 'find',
  'purpose.html': 'find',
  'saved.html': 'saved',
  'emergency.html': 'sos',
  'menu.html': 'menu',
  'journey.html': 'menu',
  'settings.html': 'menu',
  'french.html': 'menu',
  'airport.html': 'menu',
  'shoot-day.html': 'menu',
  'guide.html': 'menu',
  'post.html': 'menu',
  'bread.html': 'find',
  'contest.html': 'find',
  'shop.html': 'find',
  'michelin.html': 'find',
  'restaurants.html': 'find',
  'chocolatiers.html': 'find',
  'bakeries.html': 'find',
  'souvenirs.html': 'find',
  'supermarket.html': 'find',
  'hotels.html': 'find',
  'flea-markets.html': 'find',
  'free-spots.html': 'find'
};

export const MENU_GROUPS = [
  {
    title: 'お店・場所を探す',
    links: [
      { href: 'search.html', label: '全体から探す(検索)', desc: '店名・ラーメン・トイレ・免税など、条件と地図で' },
      { href: 'purpose.html', label: '目的から探す', desc: '撮影後の食事・雨の日・休憩・日本食・お土産' },
      { href: 'restaurants.html', label: 'レストラン・カフェ', desc: '行ってよかった店、気になっている店' },
      { href: 'chocolatiers.html', label: 'スイーツ', desc: 'ショコラティエ・パティスリー' },
      { href: 'bakeries.html', label: 'パン屋さん', desc: '行きつけのパン屋' },
      { href: 'bread.html', label: 'パンコンクール', desc: '歴代ランキングと受賞店' },
      { href: 'souvenirs.html', label: 'お土産', desc: 'パリ土産に迷ったら' },
      { href: 'supermarket.html', label: 'スーパーで買えるおすすめ', desc: '手軽に買える品' },
      { href: 'hotels.html', label: 'ホテル', desc: 'さすけのおすすめと特別なホテル' },
      { href: 'michelin.html', label: 'ミシュラン星付き', desc: '三ツ星・二ツ星ほか127軒' },
      { href: 'flea-markets.html', label: '市場', desc: '蚤の市・食品マルシェ' },
      { href: 'free-spots.html', label: '無料スポット', desc: '無料の美術館・パッサージュ' }
    ]
  },
  {
    title: '保存・地図',
    links: [
      { href: 'saved.html', label: '保存した場所', desc: '行きたい場所のリスト・パートナーへの共有' },
      { href: 'map.html', label: '全カテゴリの地図', desc: 'ピンをまとめて見る' },
      { href: 'toilets-map.html', label: 'トイレマップ', desc: '公衆トイレ581件' }
    ]
  },
  {
    title: '旅の情報',
    links: [
      { href: 'journey.html', label: '旅の流れ', desc: '出発前〜帰国日までの確認事項・入国関連の公式情報' },
      { href: 'french.html', label: 'フランス語カード', desc: '相手にそのまま見せられる' },
      { href: 'emergency.html', label: '困ったとき', desc: '盗難・体調不良・パスポート紛失など' },
      { href: 'airport.html', label: '空港アクセス', desc: 'CDG・オルリー・ボーヴェ' },
      { href: 'shoot-day.html', label: '撮影当日ガイド', desc: '前撮り予約者向け' },
      { href: 'guide.html', label: '旅行ガイド', desc: '建築さんぽ・旅行実務FAQ・免税' }
    ]
  },
  {
    title: 'その他',
    links: [
      { href: 'settings.html', label: '端末のデータ・オフライン保存', desc: '通信が不安なときの保存・保存データの確認と消去' },
      { href: 'post.html', label: '投稿する', desc: 'おすすめのお店や感想を教えてください' }
    ]
  }
];

export function pageTabId(file) {
  return PAGE_TAB[file] ?? 'menu';
}
