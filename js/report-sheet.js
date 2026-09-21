// 「情報が違っていた」の報告画面(下から出るシート)。
// ここでは何も送信しない。報告文をコピーしてもらい、運営者への既存の連絡方法で送ってもらう。
// 送信したかのような表示は決してしない(届いたかどうかを、このサイトは知りえないため)。

import { loadJson } from './data.js';
import { escapeHtml } from './html.js';
import { track } from './analytics.js';
import { REASONS, NOTE_MAX, buildReportText, normalizeContact } from './report.js';

let current = null;

function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// その店のカードがこのページにあるときだけ、カードまで飛べるURLにする
function pageUrl(uid) {
  const base = `${location.origin}${location.pathname}`;
  return document.getElementById(`place-${uid}`) ? `${base}#place-${uid}` : base;
}

async function loadContact() {
  try {
    return normalizeContact(await loadJson('data/site-config.json'));
  } catch {
    return null; // 設定を読めなくても、コピーして送る流れは使える
  }
}

const FOCUSABLE = 'input, textarea, button, a[href]';

export async function openReportSheet({ uid, name, opener = null }) {
  if (current || !uid) return;
  const contact = await loadContact();
  if (current) return;

  const root = document.createElement('div');
  root.className = 'report-root';
  root.innerHTML = `
    <div class="report-backdrop" data-report-close></div>
    <div class="report-sheet" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div class="report-head">
        <h2 class="report-title" id="report-title">「${escapeHtml(name || 'この場所')}」の情報が違っていた</h2>
        <button type="button" class="report-close" data-report-close aria-label="閉じる">×</button>
      </div>
      <p class="report-lede">この画面からは<strong>送信されません</strong>。内容を選んで報告文をコピーし、${
        contact ? '下の連絡先' : 'いつもの連絡方法(LINEなど)'
      }に貼り付けて送ってください。</p>
      <fieldset class="report-reasons">
        <legend>どれが違っていましたか?</legend>
        ${REASONS.map((r) => `<label class="report-reason"><input type="radio" name="report-reason" value="${r.code}"><span>${r.label}</span></label>`).join('')}
      </fieldset>
      <label class="report-label" for="report-note">補足(任意・${NOTE_MAX}字まで)</label>
      <textarea id="report-note" class="report-note" rows="3" maxlength="${NOTE_MAX}" placeholder="例: 日曜は休みでした"></textarea>
      <label class="report-label" for="report-text">コピーされる内容</label>
      <textarea id="report-text" class="report-text" rows="6" readonly></textarea>
      <p class="report-status" role="status" aria-live="polite"></p>
      <div class="report-actions">
        <button type="button" class="btn" data-report-copy>報告文をコピー</button>
        ${contact ? `<a class="btn btn-outline" data-report-contact href="${escapeHtml(contact.url)}" target="_blank" rel="noopener">${escapeHtml(contact.label)}を開く ↗</a>` : ''}
        <button type="button" class="btn btn-outline" data-report-close>閉じる</button>
      </div>
    </div>`;

  const sheet = root.querySelector('.report-sheet');
  const noteEl = root.querySelector('#report-note');
  const textEl = root.querySelector('#report-text');
  const statusEl = root.querySelector('.report-status');
  const selectedReason = () => root.querySelector('input[name="report-reason"]:checked')?.value ?? null;
  const currentText = () =>
    buildReportText({ name, uid, url: pageUrl(uid), reason: selectedReason(), note: noteEl.value, today: todayIso() });
  const refresh = () => {
    textEl.value = currentText() ?? '(「閉店」「営業時間」などを選ぶと、ここに報告文が出ます)';
  };
  const say = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  };

  function close() {
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('has-report-sheet');
    root.remove();
    current = null;
    if (opener?.isConnected) opener.focus();
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...sheet.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function copy() {
    const text = currentText();
    if (!text) {
      say('先に「閉店」「営業時間」などから、違っていた内容を選んでください。', true);
      root.querySelector('input[name="report-reason"]').focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      say('コピーしました。まだ送信されていません。連絡先に貼り付けて送ってください。');
      track('report', 'copy');
    } catch {
      // Clipboard API が使えない(アプリ内ブラウザ等): 選択した状態にして、手でコピーしてもらう
      textEl.focus();
      textEl.select();
      say('自動でコピーできませんでした。下の欄の文字が選択されているので、コピーして貼り付けてください。', true);
    }
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-report-close]')) close();
    else if (event.target.closest('[data-report-copy]')) copy();
    else if (event.target.closest('[data-report-contact]')) track('report', 'contact');
  });
  root.addEventListener('input', refresh);
  root.addEventListener('change', refresh);
  document.addEventListener('keydown', onKey, true);

  refresh();
  document.body.append(root);
  document.body.classList.add('has-report-sheet');
  current = { close };
  track('report', 'open');
  root.querySelector('input[name="report-reason"]').focus();
}
