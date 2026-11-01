# tape.ownyourmedia.club

The small server behind Flipside's Apple Music tapes. Adapted from Matt's Channel 47 lab (commit a3b58b2). Leave Matt's lab.channel47.app alone.

Two pieces, both Cloudflare Pages Functions:

- `functions/api/music-token.js`, the pass booth: signs a 30-minute Apple Music pass for Flipside at ownyourmedia.club. The private key stays in Cloudflare's secret settings.
- `functions/m/[preview].js`, the preview maker: `tape.ownyourmedia.club/m/<name and title>#tape=…` draws the Messages card ("Brian made you a mixtape." and the title), then hands the tape to Flipside. The part after the # never reaches the server.

`public/` is the plain landing page and the card picture (`images/tape-preview.jpg`).

## Set it up (once)

Cloudflare's drag-and-drop upload doesn't run a `functions` folder, so `public/_worker.js` holds the same two pieces in one file. Upload the **public** folder.

1. Make a free Cloudflare account. Go to **Workers & Pages** › **Create application**. At the bottom of that page, pick the **Pages** option (it may say "Looking to deploy Pages? Get started"), then **Drag and drop your files**.
2. Project name: `oym-tape`. Drop the **public** folder (it has index.html, _worker.js, _headers and images). **Deploy site**.
3. Open the project › **Settings** › **Variables and Secrets** (Production) › Add:
   - `APPLE_TEAM_ID` = `7E5R7STZMG` (Text)
   - `APPLE_KEY_ID` = `MY5CSXP2Q3` (Text)
   - `APPLE_PRIVATE_KEY` = the whole .p8 file, including the BEGIN and END lines (Secret). Paste it here only.
   Then **Deployments** › redeploy (or drop the public folder again) so the settings take.
4. **Custom domains** › Set up a custom domain › `tape.ownyourmedia.club`. Cloudflare shows a CNAME record. Add that one record at Porkbun (DNS for ownyourmedia.club).
5. Check: https://tape.ownyourmedia.club shows the landing page, and https://tape.ownyourmedia.club/api/music-token says it needs ownyourmedia.club (a 403 is right when you open it straight in a browser).

## Tests

`npm test` (Node 20 or newer) checks the pass booth signs a pass for ownyourmedia.club only, says so when the key is missing, and that the preview page shows only the name and title and hands the tape to Flipside.
