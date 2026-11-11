import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as token, onRequestOptions } from '../functions/api/music-token.js';
import { onRequestGet as preview, decodePreview, pageHTML } from '../functions/m/[preview].js';
const b64u = s => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
async function keyPair() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pk = Buffer.from(await crypto.subtle.exportKey('pkcs8', k.privateKey)).toString('base64');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${pk.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`, pub: k.publicKey };
}
const req = (origin, url = 'https://tape.ownyourmedia.club/api/music-token') => new Request(url, { headers: origin ? { Origin: origin } : {} });
test('the pass booth signs a pass that Flipside on ownyourmedia.club can use', async () => {
  const { pem, pub } = await keyPair();
  const r = await token({ request: req('https://ownyourmedia.club'), env: { APPLE_TEAM_ID: '7E5R7STZMG', APPLE_KEY_ID: 'MY5CSXP2Q3', APPLE_PRIVATE_KEY: pem } });
  assert.equal(r.status, 200); assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://ownyourmedia.club');
  const { token: t } = await r.json(); const [h, p, s] = t.split('.');
  const head = JSON.parse(Buffer.from(h, 'base64url')), body = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(head.alg, 'ES256'); assert.equal(head.kid, 'MY5CSXP2Q3'); assert.equal(body.iss, '7E5R7STZMG'); assert.deepEqual(body.origin, ['https://ownyourmedia.club']);
  assert.ok(body.exp - body.iat === 1800);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, Buffer.from(s, 'base64url'), new TextEncoder().encode(h + '.' + p)));
  assert.ok(!t.includes('PRIVATE'));
});
test('other sites are turned away', async () => {
  const r = await token({ request: req('https://example.com'), env: {} }); assert.equal(r.status, 403);
  const o = await onRequestOptions({ request: req('https://example.com') }); assert.equal(o.status, 403);
  const ok = await onRequestOptions({ request: req('https://ownyourmedia.club') }); assert.equal(ok.status, 204);
});
test('without the key it says so, and leaks nothing', async () => {
  const r = await token({ request: req('https://ownyourmedia.club'), env: {} }); assert.equal(r.status, 503); assert.match((await r.json()).error, /set up/);
});
test('the preview page: name and title only, made safe, and it hands the tape to Flipside', async () => {
  const pv = b64u(JSON.stringify([1, 'Brian <b>', 'Blaine ’98 & "friends"']));
  const r = await preview({ params: { preview: pv } }); assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Brian &lt;b&gt; made you a mixtape\./); assert.match(html, /Blaine ’98 &amp; &quot;friends&quot;/);
  assert.match(html, /og:image" content="https:\/\/tape\.ownyourmedia\.club\/images\/tape-preview-v2\.jpg/);
  assert.match(html, /location\.replace\(u\)/); assert.match(html, /https:\/\/flipside\.ownyourmedia\.club\/flipside\/app\//);
  assert.ok(!/<b>/.test(html.split('<main>')[0]));
});
test('a broken preview link gets a plain message', async () => {
  for (const bad of ['', '!!!', b64u('[2,"a","b"]'), b64u('[1,"",""]')]) { const r = await preview({ params: { preview: bad } }); assert.equal(r.status, 400); }
  assert.throws(() => decodePreview('x'.repeat(2000)));
});
test('the one-file version for drag-and-drop does the same things', async () => {
  const w = (await import('../public/_worker.js')).default;
  const { pem } = await keyPair();
  const env = { APPLE_TEAM_ID: '7E5R7STZMG', APPLE_KEY_ID: 'MY5CSXP2Q3', APPLE_PRIVATE_KEY: pem, ASSETS: { fetch: async () => new Response('landing') } };
  const t = await w.fetch(new Request('https://tape.ownyourmedia.club/api/music-token', { headers: { Origin: 'https://ownyourmedia.club' } }), env);
  assert.equal(t.status, 200); assert.ok((await t.json()).token.split('.').length === 3);
  const o = await w.fetch(new Request('https://tape.ownyourmedia.club/api/music-token', { method: 'OPTIONS', headers: { Origin: 'https://ownyourmedia.club' } }), env); assert.equal(o.status, 204);
  const bad = await w.fetch(new Request('https://tape.ownyourmedia.club/api/music-token', { headers: { Origin: 'https://evil.example' } }), env); assert.equal(bad.status, 403);
  const pv = b64u(JSON.stringify([1, 'Brian', 'Blaine ’98']));
  const p = await w.fetch(new Request('https://tape.ownyourmedia.club/m/' + pv), env); assert.equal(p.status, 200); assert.match(await p.text(), /Brian made you a mixtape\./);
  const home = await w.fetch(new Request('https://tape.ownyourmedia.club/'), env); assert.equal(await home.text(), 'landing');
});
