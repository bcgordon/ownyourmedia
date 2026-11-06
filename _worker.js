// Own Your Media apps on their own addresses (Cloudflare Pages, reading the same GitHub repo as ownyourmedia.club).
// Each app gets its own site so an iPhone keeps their Home Screen apps apart. The files are the repo's own;
// this only sends each address to its app's folder. ownyourmedia.club itself stays on GitHub Pages.
const APPS = {
  'flipside.ownyourmedia.club': ['/flipside/app/', ['/flipside/', '/assets/', '/demo/']],
  'mystereo.ownyourmedia.club': ['/mystereo/app/', ['/mystereo/', '/assets/', '/demo/']],
  'myshelf.ownyourmedia.club': ['/myshelf/', ['/myshelf/', '/assets/']],
  'rao.ownyourmedia.club': ['/rao/', ['/rao/', '/assets/']]
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url), app = APPS[url.hostname];
    if (!app) return env.ASSETS.fetch(request);                       // the pages.dev preview address: everything, as is
    const [home, allowed] = app;
    if (url.pathname === '/' || url.pathname === home.slice(0, -1)) return Response.redirect(url.origin + home + url.search + url.hash, 302);
    if (!allowed.some(p => url.pathname.startsWith(p))) return Response.redirect('https://ownyourmedia.club' + url.pathname + url.search, 302);
    const res = await env.ASSETS.fetch(request);
    if (/\.(html|txt|webmanifest|js)$/.test(url.pathname) || url.pathname.endsWith('/')) {   // always fresh, so updates arrive
      const r = new Response(res.body, res); r.headers.set('Cache-Control', 'no-cache'); return r;
    }
    return res;
  }
};
