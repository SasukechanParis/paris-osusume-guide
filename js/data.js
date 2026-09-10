const VERSION = '2026-09-10-12';

export async function loadJson(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${path}${sep}v=${VERSION}`);
  return res.json();
}
