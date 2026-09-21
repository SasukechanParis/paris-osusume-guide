// リストの共有(純粋関数)。共有するのは「共有した時点のコピー」で、共同編集や自動同期ではない。
// 共有データには、公開データの安定ID(uid)と順序だけを入れる。名前・宿泊ホテル・予約内容・メモ・GPS位置は入れない。
// 形式(URLフラグメント #s= の値、または貼り付け用コード): "v1~r.septime~g.hotel-volney-opera"
// 使う文字はすべてURLで変換されない文字(英数字・-・.・~)なので、エンコードなしでそのまま共有できる。

import { parseUid } from './places.js';

export const SHARE_VERSION = 'v1';
export const MAX_SHARE_ITEMS = 100;
const MAX_CODE_LENGTH = 4000;
// これを超えるとLINE等でURLが途中で切れることがあるため、テキスト書き出しを案内する
export const URL_COMFORT_LENGTH = 1800;

export function encodeShare(uids) {
  const clean = [];
  for (const uid of uids) {
    if (parseUid(uid) && !clean.includes(uid)) clean.push(uid);
    if (clean.length >= MAX_SHARE_ITEMS) break;
  }
  return [SHARE_VERSION, ...clean].join('~');
}

// 共有リンクのURL・フラグメント・コードのどれを貼り付けても、コード部分を取り出す
export function extractCode(input) {
  const text = String(input ?? '').trim();
  // 文字種はここでは絞らない(途中に不正な文字があっても後ろの項目を黙って捨てず、項目ごとに検証して数える)
  const fromFragment = /[#&?]s=([^\s&#]+)/.exec(text);
  if (fromFragment) return fromFragment[1];
  return /^v\d+~/.test(text) ? text.split(/\s+/)[0] : '';
}

// 戻り値: { ok: true, uids, invalid }  |  { ok: false, reason: 'empty'|'version'|'format'|'too-long' }
// invalid: 形式が不正で読み飛ばした項目の数。件数・長さの上限を検証してから中身を読む
export function decodeShare(input) {
  const code = extractCode(input);
  if (!code) return { ok: false, reason: 'empty' };
  if (code.length > MAX_CODE_LENGTH) return { ok: false, reason: 'too-long' };
  const [version, ...tokens] = code.split('~');
  if (version !== SHARE_VERSION) return { ok: false, reason: 'version' };
  if (tokens.length === 0) return { ok: false, reason: 'format' };
  const uids = [];
  let invalid = 0;
  for (const token of tokens.slice(0, MAX_SHARE_ITEMS * 2)) {
    if (!parseUid(token)) invalid += 1;
    else if (!uids.includes(token)) uids.push(token);
    if (uids.length >= MAX_SHARE_ITEMS) break;
  }
  if (uids.length === 0) return { ok: false, reason: 'format' };
  return { ok: true, uids, invalid };
}

export function buildShareUrl(base, uids) {
  const url = `${base}#s=${encodeShare(uids)}`;
  return { url, tooLong: url.length > URL_COMFORT_LENGTH };
}

// テキスト書き出し(LINEやメモに貼れる。リンクが長すぎるときの代わり)。places: Place の配列(順序どおり)
export function toShareText(places, title = 'パリで行きたい場所') {
  const lines = [`${title}(${places.length}件)`, ''];
  places.forEach((place, i) => {
    lines.push(`${i + 1}. ${place.name}`);
    if (place.address) lines.push(`   ${place.address}`);
    if (place.google_maps_url) lines.push(`   ${place.google_maps_url}`);
  });
  return lines.join('\n');
}
