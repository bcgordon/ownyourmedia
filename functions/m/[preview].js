// tape.ownyourmedia.club/m/<name and title> · the preview maker.
// Messages and other apps read this page to draw the link card: "Brian made you a mixtape." and the title.
// Only the sender's name and the tape's title are in the address. The tape itself rides after the #, which browsers never send
// to a server, and this page hands it straight to Flipside.
export const FLIPSIDE = 'https://ownyourmedia.club/flipside/app/';
export const SITE = 'https://tape.ownyourmedia.club';
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function decodePreview(value) {
  if (!/^[\w-]{1,1500}$/.test(value || '')) throw new Error('bad');
  const f = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
  if (!Array.isArray(f) || f.length !== 3 || f[0] !== 1 || typeof f[1] !== 'string' || typeof f[2] !== 'string') throw new Error('bad');
  const sender = f[1].trim().slice(0, 40), title = f[2].trim().slice(0, 80);
  if (!sender || !title) throw new Error('bad');
  return { sender, title };
}
export function pageHTML({ sender, title }, url) {
  const heading = `${sender} made you a mixtape.`, image = `${SITE}/images/tape-preview-v2.jpg`;
  const m = (k, v, name) => `<meta ${name ? 'name' : 'property'}="${k}" content="${esc(v)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(heading + ' — ' + title)}</title><link rel="canonical" href="${esc(url)}">
${m('description', title, true)}${m('og:type', 'website')}${m('og:site_name', 'Own Your Media Club')}${m('og:url', url)}${m('og:title', heading + '\n' + title)}${m('og:description', title)}
${m('og:image', image)}${m('og:image:type', 'image/jpeg')}${m('og:image:width', '1200')}${m('og:image:height', '763')}${m('og:image:alt', 'A cassette mixtape')}
${m('twitter:card', 'summary_large_image', true)}${m('twitter:title', heading + ' ' + title, true)}${m('twitter:image', image, true)}
<meta name="robots" content="noindex,nofollow">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4EDE0;color:#1C1B19;font:400 20px/1.4 Georgia,serif;text-align:center;padding:24px}a{color:#C93C25;font-weight:700}</style>
</head><body><main><p>${esc(heading)}<br><b>${esc(title)}</b></p><p><a id="go" href="${FLIPSIDE}">Open it in Flipside</a></p></main>
<script>(function(){var h=location.hash;var u=${JSON.stringify(FLIPSIDE)}+(h&&h.indexOf('#tape=')===0?h:'');document.getElementById('go').href=u;if(h&&h.indexOf('#tape=')===0)location.replace(u);})();</script>
</body></html>`;
}
export async function onRequestGet({ params }) {
  let p; try { p = decodePreview(params.preview); }
  catch { return new Response('This tape link is broken or cut short. Ask for a new one.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }); }
  return new Response(pageHTML(p, `${SITE}/m/${params.preview}`), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}
export async function onRequestHead(context) { const r = await onRequestGet(context); return new Response(null, { status: r.status, headers: r.headers }); }
