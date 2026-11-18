#!/usr/bin/env python3
"""Finds a real cover for every pick in the live repo's offline/shelf.json that doesn't have one yet.

Usage: python3 src/fetch_covers.py /path/to/ownyourmedia [--force TITLE]

Also runs on its own in the live repo after every change to the shelf (.github/workflows/shelf.yml, which uses the
copy at .github/scripts/fetch_covers.py; keep the two the same).

- Books: Open Library. Music (vinyl, CD or cassette): Apple's music catalog (iTunes Search). Movies and TV: the poster on the
  film's or show's Wikipedia page.
- Saves each cover once, as offline/covers/<slug>.webp (at most 600px on the long side, no metadata), and writes
  "/offline/covers/<slug>.webp" into the pick's "cover" (the same form Pages CMS writes). The site then serves its own copy; visitors never load these services.
- A pick whose "cover" file already exists is left alone, so a manual cover (a file BC put in offline/covers/)
  always wins. Every cover file with photo metadata (a phone photo's location) is re-saved without it, turned
  upright first, and shrunk to 1200px on the long side if it's bigger.
- Nothing found: the pick keeps no cover and the page draws a typed one. Say so and add one by hand.
Needs Pillow. Standard library otherwise.
"""
import json, os, re, sys, time, io, urllib.request, urllib.parse
from PIL import Image, ImageOps

UA = {'User-Agent': 'OwnYourMediaClub-covers/1.0 (+https://ownyourmedia.club)'}

def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception as e:
            if getattr(e, 'code', None) == 404: return None
            time.sleep(4 * (i + 1))
    return None

def js(url):
    b = get(url)
    return json.loads(b) if b else None

def slug(p):
    return re.sub(r'[^a-z0-9]+', '-', (p.get('title', '') + ' ' + str(p.get('year', ''))).lower()).strip('-') or 'pick'

def book(p):
    q = {'title': p['title'], 'fields': 'title,cover_i', 'limit': 5}
    if p.get('by'): q['author'] = p['by']
    d = js('https://openlibrary.org/search.json?' + urllib.parse.urlencode(q)) or {}
    for doc in d.get('docs', []):
        if doc.get('cover_i'): return get(f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg")

def vinyl(p):
    d = js('https://itunes.apple.com/search?' + urllib.parse.urlencode({'term': f"{p.get('by','')} {p['title']}", 'media': 'music', 'entity': 'album', 'limit': 5, 'country': 'us'})) or {}
    res = d.get('results', [])
    want = p['title'].lower()
    res.sort(key=lambda x: x.get('collectionName', '').lower() != want)
    for x in res:
        if x.get('artworkUrl100'): return get(x['artworkUrl100'].replace('100x100bb', '600x600bb'))

def movie(p):
    W = 'https://en.wikipedia.org/w/api.php?'
    for t in [f"{p['title']} ({p.get('year')} film)", f"{p['title']} (film)", f"{p['title']} (TV series)", f"{p['title']} ({p.get('year')} TV series)", p['title']]:
        d = js(W + urllib.parse.urlencode({'action': 'parse', 'page': t, 'prop': 'wikitext', 'section': 0, 'format': 'json', 'redirects': 1}))
        w = ((d or {}).get('parse') or {}).get('wikitext', {}).get('*', '')
        if 'Infobox film' not in w and 'Infobox television' not in w: time.sleep(2); continue
        m = re.search(r'\|\s*image\s*=\s*([^\n|]+)', w)
        if not m: return None
        time.sleep(2)
        q = js(W + urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + m.group(1).strip(), 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 500, 'format': 'json'})) or {}
        for pg in q.get('query', {}).get('pages', {}).values():
            for ii in pg.get('imageinfo', []): return get(ii.get('thumburl') or ii['url'])
        return None

FIND = {'books': book, 'music': vinyl, 'vinyl': vinyl, 'movies': movie}   # 'vinyl' is the old name for music

def save(raw, path):
    im = Image.open(io.BytesIO(raw) if isinstance(raw, bytes) else raw).convert('RGB')
    im.thumbnail((600, 600))
    clean = Image.new('RGB', im.size); clean.paste(im)   # a fresh image carries no metadata
    clean.save(path, 'WEBP', quality=84)

def main():
    args = sys.argv[1:]
    if not args: print(__doc__); sys.exit(2)
    live = args[0]; force = args[args.index('--force') + 1].lower() if '--force' in args else None
    sp = os.path.join(live, 'offline', 'shelf.json'); cd = os.path.join(live, 'offline', 'covers')
    os.makedirs(cd, exist_ok=True)
    data = json.load(open(sp)); changed = False
    for p in data.get('picks', []):
        f = os.path.basename(str(p.get('cover') or ''))
        if f and os.path.exists(os.path.join(cd, f)) and p.get('title', '').lower() != force:
            continue
        find = FIND.get(p.get('shelf'))
        raw = find(p) if find else None
        if not raw:
            print(f"NONE     {p.get('shelf')}: {p.get('title')} (typed cover until you add one)"); continue
        f = slug(p) + '.webp'; save(raw, os.path.join(cd, f)); p['cover'] = '/offline/covers/' + f; changed = True
        print(f"FETCHED  {p.get('shelf')}: {p.get('title')} -> covers/{f}"); time.sleep(1.5)
    for f in sorted(os.listdir(cd)):
        fp = os.path.join(cd, f)
        try:
            with Image.open(fp) as im:
                meta = bool(im.info.get('exif') or im.getexif())
            if meta:
                with Image.open(fp) as im:
                    im.load(); c = ImageOps.exif_transpose(im).convert('RGB')   # keep it upright once the rotation tag is gone
                c.thumbnail((1200, 1200)); n = Image.new('RGB', c.size); n.paste(c)
                n.save(fp, quality=88); print(f"CLEANED  covers/{f} (photo metadata removed)")
        except Exception:
            print(f"SKIPPED  covers/{f} (not an image)")
    if changed:
        json.dump(data, open(sp, 'w'), ensure_ascii=False, indent=2); open(sp, 'a').write('\n')

if __name__ == '__main__':
    main()
