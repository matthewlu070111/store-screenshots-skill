/**
 * Build a self-contained local preview page for a generated output folder.
 */
import { escapeHtml } from './utils.mjs';

export function buildPreview(manifest) {
  const esc = escapeHtml;
  const sections = (manifest.sets || []).map((set) => {
    const cards = (set.files || []).map((file) => `
      <a class="card" href="${encodeURI(file.file)}" target="_blank" rel="noopener">
        <img src="${encodeURI(file.file)}" alt="${esc(file.title || file.file)}" loading="lazy">
        <div class="meta"><strong>${esc(file.title || file.file)}</strong><span>${file.width}×${file.height}</span></div>
      </a>`).join('');
    const label = set.kind === 'app-preview-poster' ? 'App Preview poster' : (set.store || 'Custom');
    return `
      <section>
        <header><h2>${esc(label)} · ${esc(set.device)}${set.locale ? ' · ' + esc(set.locale) : ''}</h2>
        <span>${set.width}×${set.height} · ${(set.files || []).length} shot(s)</span></header>
        <div class="grid">${cards}</div>
      </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'">
<title>${esc(manifest.app || 'Store screenshots')} · preview</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0b0d12;color:#e8eaf0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}
  main{max-width:1500px;margin:0 auto;padding:40px 28px 80px}
  h1{font-size:28px;margin:0 0 6px;letter-spacing:-.02em}
  .sub{color:#8b93a7;margin-bottom:36px}
  section{margin:0 0 44px}
  header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-bottom:1px solid #222733;padding-bottom:10px;margin-bottom:18px}
  h2{font-size:16px;margin:0}
  header span{color:#7d8599;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}
  .card{background:#131722;border:1px solid #242a38;border-radius:14px;padding:10px;text-decoration:none;color:inherit;transition:.15s}
  .card:hover{border-color:#3d4660;transform:translateY(-2px)}
  img{width:100%;height:360px;object-fit:contain;border-radius:8px;background:#080a0f;display:block}
  .meta{display:flex;justify-content:space-between;gap:10px;padding:10px 3px 2px;font-size:12px;color:#7d8599}
  .meta strong{color:#d9ddea;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style></head><body><main>
<h1>${esc(manifest.app || 'Store screenshots')}</h1>
<div class="sub">Generated ${esc(manifest.generatedAt || '')} · click any file to open full size</div>
${sections}
</main></body></html>`;
}
