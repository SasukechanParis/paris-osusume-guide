const VERSION = '2026-09-11-2';

export async function loadJson(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${path}${sep}v=${VERSION}`);
  return res.json();
}
