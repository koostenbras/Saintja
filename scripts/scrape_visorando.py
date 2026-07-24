# Temporary helper (runs in CI): fetch Visorando commune pages and extract
# route candidates (title, stats, per-route URL) into scratch/visorando-list.txt
import re
import html
import urllib.request
from pathlib import Path

SLUGS = [
    'sainte-jalle', 'buis-les-baronnies', 'nyons', 'remuzat', 'saint-may',
    'bellecombe-tarendol', 'mevouillon', 'bedoin', 'beaumont-du-ventoux',
    'gigondas', 'saou', 'monieux', 'malaucene',
]
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}

out = []
for slug in SLUGS:
    out.append(f'===== {slug} =====')
    url = f'https://www.visorando.com/randonnee-{slug}.html'
    try:
        req = urllib.request.Request(url, headers=UA)
        src = urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')
    except Exception as e:
        out.append(f'FETCH FAIL: {e}')
        continue
    out.append(f'(page size: {len(src)})')
    seen = set()
    count = 0
    # Diagnostic: how do route links look on this page?
    sample = re.findall(r'href="([^"]*randonnee[^"]*)"', src)[:8]
    out.append('SAMPLE HREFS: ' + ' || '.join(sample))
    for m in re.finditer(r'href="(?:https?://www\.visorando\.com)?(/randonnee-[a-z0-9\-]+\.html)"[^>]*>(.*?)</a>', src, re.S):
        href, text = m.group(1), re.sub(r'<[^>]+>', ' ', m.group(2))
        text = html.unescape(re.sub(r'\s+', ' ', text)).strip()
        if href in seen or len(text) < 8:
            continue
        seen.add(href)
        tail = re.sub(r'<[^>]+>', ' ', src[m.end():m.end() + 900])
        tail = html.unescape(re.sub(r'\s+', ' ', tail))
        km = re.search(r'([\d]+[.,]\d+)\s*km', tail)
        dplus = re.search(r'\+\s*([\d]+)\s*m', tail)
        dur = re.search(r'(\d+h\s?\d*)', tail)
        diff = re.search(r'(Très facile|Facile|Moyenne|Très difficile|Difficile)', tail)
        out.append(
            f'{text[:70]} | km={km.group(1) if km else "?"} | D+={dplus.group(1) if dplus else "?"}'
            f' | t={dur.group(1) if dur else "?"} | {diff.group(1) if diff else "?"}'
            f' | https://www.visorando.com{href}'
        )
        count += 1
        if count >= 15:
            break
    out.append(f'TOTAL: {count}')
    # Diagnostic 2: markup around the first route-stats pattern (e.g. "+744m")
    stats = re.search(r'.{800}\+\s?\d{2,4}\s?m.{400}', src, re.S)
    if stats:
        chunk = stats.group(0).replace('\n', ' ')
        out.append('STATS CONTEXT: ' + chunk)

Path('scratch').mkdir(exist_ok=True)
Path('scratch/visorando-list.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out[:10]))
print(f'... wrote {len(out)} lines')
