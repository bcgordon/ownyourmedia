// tape.ownyourmedia.club · the pass booth.
// Signs a 30-minute Apple Music developer pass for Flipside. Adapted from Matt's Channel 47 lab (commit a3b58b2).
// The private key lives only in this server's secret settings (APPLE_PRIVATE_KEY). It never reaches Flipside's code.
export const ALLOWED = ['https://ownyourmedia.club', 'https://www.ownyourmedia.club', 'https://flipside.ownyourmedia.club', 'https://mystereo.ownyourmedia.club', 'http://localhost:8766', 'http://localhost:8788', 'http://127.0.0.1:8788'];
function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}
export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED.includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors(origin) });
}
export async function onRequestGet({ request, env }) {
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
