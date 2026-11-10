# ownyourmedia.club — live site

This repo is what's served at ownyourmedia.club (GitHub Pages behind Cloudflare). It's public.

The same files are also served by the Cloudflare Pages project `oym-apps`, which gives each app its own address (flipside., mystereo., myshelf., rao.ownyourmedia.club) through `_worker.js` at the root. The tape server (`public/`, `functions/`) is a separate Cloudflare project, `oym-tape`, deployed by hand: keep the repo copy in step with what's live.

- **Docs, rules and build source live in the private repo `bcgordon/oym-hq`.** Read its `CLAUDE.md`, `NEXT.md` and `docs/rules.md` before changing anything here. If that repo isn't in your session, stop and ask.
- **Built files only.** The site pages come from `oym-hq/source/site/`, the apps from `oym-hq/source/app/`. Don't hand-edit a built page; change the source and rebuild. Pages kept by hand (never overwritten by a build): `/take-one/`, `offline/lights.json`, `liner-notes.json`, `places.json`, `detox-tools.json`.
- **Changes arrive by pull request.** BC merges. Never push to `main`, and never rewrite history.
- **Nothing private here:** no addresses, no tester details, no keys or tokens. The Cloudflare analytics token and the Supabase publishable key are public by design.
- `.github/workflows/checks.yml` must pass: no Plex tokens or private keys, tape server tests, analytics on every page in `sitemap.xml`.
- If a GitHub Pages publish hangs at "finished_file_sync" and times out, re-running it retries the same stuck publish. Merge a new commit instead; that starts a fresh one.
