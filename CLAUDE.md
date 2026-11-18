# ownyourmedia.club — live site

This repo is what's served at ownyourmedia.club (GitHub Pages behind Cloudflare). It's public.

The same files are also served by the Cloudflare Pages project `oym-apps`, which gives each app its own address (flipside., mystereo., myshelf., rao.ownyourmedia.club) through `_worker.js` at the root. The tape server (`public/`, `functions/`) is a separate Cloudflare project, `oym-tape`, deployed by hand: keep the repo copy in step with what's live.

- **Docs, rules and build source live in the private repo `bcgordon/oym-hq`.** Read its `CLAUDE.md`, `NEXT.md` and `docs/rules.md` before changing anything here. If that repo isn't in your session, stop and ask.
- **Built files only.** The site pages come from `oym-hq/source/site/`, the apps from `oym-hq/source/app/`. Don't hand-edit a built page; change the source and rebuild. Pages kept by hand (never overwritten by a build): `/take-one/`, `/elite/` (a redirect to myStereo since 1.25.77), `offline/lights.json`, `offline/shelf.json` and `offline/covers/` (the Library), `liner-notes.json`, `places.json`, `detox-tools.json`, `club-tape.json` (this quarter's members' tape on `/card/`: title, season and the Apple Music and Spotify tape links; empty links show "Coming soon").
- **Changes arrive by pull request.** BC merges. Never push to `main`, and never rewrite history.
- **One exception (Nov 18): the Library's data.** BC edits `offline/shelf.json` and `offline/covers/` in Pages CMS (`.pages.yml`), which saves straight to `main`, and the `library covers` Action (`.github/workflows/shelf.yml`, script `.github/scripts/fetch_covers.py`) commits covers and metadata cleanups to `main` after each change. Nothing else goes to `main` without a PR. All three files come from `oym-hq/source/site/live/` and `src/fetch_covers.py`.
- **Nothing private here:** no addresses, no tester details, no keys or tokens. The Cloudflare analytics token and the Supabase publishable key are public by design.
- `.github/workflows/checks.yml` must pass: no Plex tokens or private keys, tape server tests, analytics on every page in `sitemap.xml`.
- If a GitHub Pages publish hangs at "finished_file_sync" and times out, re-running it retries the same stuck publish. Merge a new commit instead; that starts a fresh one.
