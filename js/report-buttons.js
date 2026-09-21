// カードの「情報が違っていた」ボタンを有効にし、押されたら報告画面を開く。
// 報告画面の本体(report-sheet.js)は、押されたときに初めて読み込む。

import { cardOptions } from './card-options.js';

cardOptions.report = true;

export function installReportButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-report]');
    if (!button) return;
    try {
      const { openReportSheet } = await import('./report-sheet.js');
      openReportSheet({ uid: button.dataset.report, name: button.dataset.reportName ?? '', opener: button });
    } catch (err) {
      console.error(err);
      const { showToast } = await import('./toast.js');
      showToast('報告画面を開けませんでした。通信を確認して、もう一度お試しください。');
    }
  });
}
