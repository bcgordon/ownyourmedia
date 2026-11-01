// tape.ownyourmedia.club as one file, so it works with Cloudflare Pages' drag-and-drop upload
// (drag-and-drop doesn't run a functions folder, but it does run _worker.js). Same code as functions/.
// tape.ownyourmedia.club · the pass booth.
// Signs a 30-minute Apple Music developer pass for Flipside. Adapted from Matt's Channel 47 lab (commit a3b58b2).
// The private key lives only in this server's secret settings (APPLE_PRIVATE_KEY). It never reaches Flipside's code.
const ALLOWED = ['https://ownyourmedia.club', 'https://www.ownyourmedia.club', 'http://localhost:8766', 'http://localhost:8788', 'http://127.0.0.1:8788'];
function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}
async function tokenOptions({ request }) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED.includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors(origin) });
}
async function tokenGet({ request, env }) {
  // Flipside calls from ownyourmedia.club, so the page's address arrives in the Origin header.
  const origin = request.headers.get('Origin') || new URL(request.url).origin;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!ALLOWED.includes(origin)) return new Response('{}', { status: 403, headers });
  Object.assign(headers, cors(origin));
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) return new Response(JSON.stringify({ error: 'Apple Music isn’t set up on this server yet.' }), { status: 503, headers });
  try {
    const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const json = value => encode(new TextEncoder().encode(JSON.stringify(value)));
    const pem = env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const now = Math.floor(Date.now() / 1000);
    const payload = json({ alg: 'ES256', kid: env.APPLE_KEY_ID }) + '.' + json({ iss: env.APPLE_TEAM_ID, iat: now, exp: now + 1800, origin: [origin] });
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(payload));
    return new Response(JSON.stringify({ token: payload + '.' + encode(new Uint8Array(signature)) }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'The Apple Music pass couldn’t be signed. Check the server settings.' }), { status: 503, headers });
  }
}

// tape.ownyourmedia.club/m/<name and title> · the preview maker.
// Messages and other apps read this page to draw the link card: "Brian made you a mixtape." and the title.
// Only the sender's name and the tape's title are in the address. The tape itself rides after the #, which browsers never send
// to a server, and this page hands it straight to Flipside.
const FLIPSIDE = 'https://ownyourmedia.club/flipside/app/';
const SITE = 'https://tape.ownyourmedia.club';
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function decodePreview(value) {
  if (!/^[\w-]{1,1500}$/.test(value || '')) throw new Error('bad');
  const f = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
  if (!Array.isArray(f) || f.length !== 3 || f[0] !== 1 || typeof f[1] !== 'string' || typeof f[2] !== 'string') throw new Error('bad');
  const sender = f[1].trim().slice(0, 40), title = f[2].trim().slice(0, 80);
  if (!sender || !title) throw new Error('bad');
  return { sender, title };
}
function pageHTML({ sender, title }, url) {
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
async function previewGet({ params }) {
  let p; try { p = decodePreview(params.preview); }
  catch { return new Response('This tape link is broken or cut short. Ask for a new one.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }); }
  return new Response(pageHTML(p, `${SITE}/m/${params.preview}`), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    if (path === '/api/music-token') {
      if (request.method === 'OPTIONS') return tokenOptions({ request, env });
      if (request.method === 'GET') return tokenGet({ request, env });
      return new Response(null, { status: 405 });
    }
    const m = /^\/m\/([^/]+)\/?$/.exec(path);
    if (m) { const r = await previewGet({ params: { preview: m[1] } }); return request.method === 'HEAD' ? new Response(null, { status: r.status, headers: r.headers }) : r; }
    return env.ASSETS.fetch(request);
  }
};
