// 「さすけのおすすめ」⇔「先輩カップルのおすすめ」の切り替え(各カテゴリページ共通)。
// 選択を覚えておき、外部リンクから戻ったときも同じタブを開く。

import { rememberUi, recallUi } from './state-restore.js';

const DEFAULT_PANELS = { sasuke: 'sasuke-panel', guest: 'guest-panel' };

export function setupSourceTabs({ tabsId = 'source-tabs', panels = DEFAULT_PANELS } = {}) {
  const tabs = document.getElementById(tabsId);
  if (!tabs) return;
  tabs.setAttribute('role', 'tablist');
  tabs.querySelectorAll('.tab-btn').forEach((btn) => btn.setAttribute('role', 'tab'));
  for (const id of Object.values(panels)) document.getElementById(id)?.setAttribute('role', 'tabpanel');

  function select(source, { remember = true } = {}) {
    tabs.querySelectorAll('.tab-btn').forEach((btn) => {
      const on = btn.dataset.source === source;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    for (const [key, id] of Object.entries(panels)) {
      const panel = document.getElementById(id);
      if (panel) panel.hidden = key !== source;
    }
    if (remember) rememberUi('source-tab', source);
  }

  tabs.addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (btn) select(btn.dataset.source);
  });

  const saved = recallUi('source-tab');
  select(saved && panels[saved] ? saved : 'sasuke', { remember: false });
}
