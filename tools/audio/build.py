#!/usr/bin/env python3
"""tools/audio/build.py — fabrique les sons enregistrés du jeu (assets/audio/).

  python3 tools/audio/build.py            # tout reconstruire
  python3 tools/audio/build.py --events fs:459981   # affiche les événements détectés d'une source
  python3 tools/audio/build.py --only amb/rain_roof

Sources (toutes CC0, voir assets/audio/CREDITS.md) téléchargées une fois dans tools/audio/.cache/ :
  ('fs', id)            Freesound — aperçu HQ public (cdn.freesound.org), licence vérifiée CC0
  ('kenney', pack, f)   Kenney.nl — paquet CC0 (zip)
  ('vsco', chemin)      VSCO 2 Community Edition (CC0) — github.com/sgossner/VSCO-2-CE
  ('vcsl', chemin)      Versilian Community Sample Library (CC0) — github.com/sgossner/VCSL
Le catalogue (quoi, d'où, quel traitement) est dans tools/audio/catalog.py.
Prérequis : python3 + numpy + scipy, ffmpeg (libmp3lame).
"""
import os, sys, json, math, re, io, zipfile, urllib.request, urllib.parse, http.cookiejar, hashlib
import numpy as np
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alib
from catalog import ENTRIES, FS_META

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.environ.get('AGI_AUDIO_CACHE', os.path.join(HERE, '.cache'))
OUT = os.path.join(ROOT, 'assets', 'audio')
SR = 44100
UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'


# ---------------------------------------------------------------- téléchargement
def _get(url, headers=None, opener=None):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    with (opener.open(req, timeout=180) if opener else urllib.request.urlopen(req, timeout=180)) as r:
        return r.read()


def _kenney_pack(pack):
    z = os.path.join(CACHE, 'kenney', pack + '.zip')
    if not os.path.exists(z):
        os.makedirs(os.path.dirname(z), exist_ok=True)
        cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        _get(f'https://kenney.nl/assets/{pack}', opener=op)
        did = ('assets/' + pack).encode().hex()
        j = json.loads(_get(f'https://kenney.nl/download-link/{did}', {'Referer': f'https://kenney.nl/assets/{pack}', 'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors'}, op))
        open(z, 'wb').write(_get(j['url'], {'Referer': f'https://kenney.nl/assets/{pack}'}, op))
    return z


def fetch(src):
    kind = src[0]
    if kind == 'fs':
        p = os.path.join(CACHE, 'fs', f'{src[1]}.mp3')
        if not os.path.exists(p):
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(_get('https://cdn.freesound.org/previews/' + FS_META[src[1]]['preview']))
        return p
    if kind == 'kenney':
        p = os.path.join(CACHE, 'kenney', src[1], src[2])
        if not os.path.exists(p):
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with zipfile.ZipFile(_kenney_pack(src[1])) as zf:
                name = next(n for n in zf.namelist() if n.endswith('/' + src[2]) or n == src[2])
                open(p, 'wb').write(zf.read(name))
        return p
    if kind in ('vsco', 'vcsl'):
        repo = {'vsco': 'VSCO-2-CE/master', 'vcsl': 'VCSL/main'}[kind]
        p = os.path.join(CACHE, kind, src[1])
        if not os.path.exists(p):
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(_get(f'https://raw.githubusercontent.com/sgossner/{repo}/' + urllib.parse.quote(src[1])))
        return p
    raise ValueError(src)


# ---------------------------------------------------------------- traitements
def env_db(x, sr, win=0.01):
    m = np.abs(x).max(axis=1); n = int(win * sr)
    if len(m) < 4 * n: n = max(16, len(m) // 8)                # très court (clic) : fenêtre plus fine
    k = len(m) // n
    e = m[: k * n].reshape(k, n).max(axis=1)
    return 20 * np.log10(np.maximum(e, 1e-9)), n


def events(x, sr, rel=-32, gap=0.12, minlen=0.05):
    """Découpe une prise en événements (attaques séparées par du silence relatif)."""
    e, n = env_db(x, sr); th = e.max() + rel
    on = e > th; ev = []; i = 0; L = len(e)
    while i < L:
        if on[i]:
            j = i; last = i
            while j < L and (j - last) * n / sr < gap:
                if on[j]: last = j
                j += 1
            if (last - i) * n / sr >= minlen: ev.append((i * n / sr, (last + 1) * n / sr))
            i = j
        else: i += 1
    return ev


def trim(x, sr, rel=-50, pre=0.004, post_rel=-60, fout=0.03, maxdur=None):
    e, n = env_db(x, sr); pk = e.max()
    idx = np.where(e > pk + rel)[0]
    if not len(idx): return x
    a = max(0, idx[0] * n - int(pre * sr))
    idx2 = np.where(e > pk + post_rel)[0]
    b = min(len(x), (idx2[-1] + 1) * n)
    y = x[a:b]
    if maxdur and len(y) > maxdur * sr: y = y[: int(maxdur * sr)]
    return alib.fade(y, sr, 0.002, fout)


def pitch_shift(x, semis):
    if not semis: return x
    r = 2 ** (semis / 12.0)                       # >1 : plus aigu (lecture plus rapide)
    up, down = 100, int(round(100 * r))
    g = math.gcd(up, down)
    return resample_poly(x, up // g, down // g, axis=0)


def limiter(x, sr, ceil_db=-1.0, rel=0.06):
    c = 10 ** (ceil_db / 20); a = np.abs(x).max(axis=1)
    if a.max() <= c: return x
    need = np.maximum(a / c, 1.0)
    # maintien (anticipation 2 ms) puis relâchement exponentiel
    la = int(0.002 * sr)
    from scipy.ndimage import maximum_filter1d
    need = maximum_filter1d(need, size=2 * la + 1)
    k = math.exp(-1 / (rel * sr)); g = np.empty_like(need); cur = 1.0
    for i in range(len(need)):
        cur = need[i] if need[i] > cur else cur * k + need[i] * (1 - k)
        g[i] = cur
    return x / g[:, None]


def to_ch(x, ch):
    if ch == 1: return x.mean(axis=1, keepdims=True)
    if x.shape[1] == 1: return np.repeat(x, 2, axis=1)
    return x


def render_source(spec, ch):
    """spec = dict(src, start, dur, ev, pitch, hp, lp, gain) → signal (n, ch) à SR."""
    x = alib.load(fetch(spec['src']), SR, 2)
    if 'ev' in spec:
        ev = events(x, SR, spec.get('evrel', -32), spec.get('evgap', 0.12))
        a, b = ev[spec['ev']]
        x = x[max(0, int((a - 0.01) * SR)): int((b + spec.get('evtail', 0.25)) * SR)]
    if 'start' in spec or 'dur' in spec:
        a = int(spec.get('start', 0) * SR); b = a + int(spec['dur'] * SR) if 'dur' in spec else len(x)
        x = x[a:b]
    x = to_ch(x, ch)
    if spec.get('pitch'): x = pitch_shift(x, spec['pitch'])
    if spec.get('hp'): x = alib.highpass(x, SR, spec['hp'])
    if spec.get('lp'): x = alib.lowpass(x, SR, spec['lp'])
    if spec.get('rev'): x = x[::-1]
    return x * (10 ** (spec.get('gain', 0) / 20))


def build_entry(E):
    kind, ch = E['kind'], E.get('ch', 1)
    layers = E['layers'] if 'layers' in E else [E]
    parts = []
    for L in layers:
        y = render_source(L, ch)
        off = int(L.get('at', 0) * SR)
        parts.append(np.vstack([np.zeros((off, ch)), y]))
    n = max(len(p) for p in parts); x = np.zeros((n, ch))
    for p in parts: x[: len(p)] += p
    x = x - x.mean(axis=0)                                      # pas de composante continue
    meta = {}
    if kind == 'loop':
        L, xf, tail = E['len'], E.get('xfade', 2.0), E.get('tail', 1.0)
        if E.get('raw'):                                          # déjà une boucle parfaite (pas rythmique à préserver)
            L = len(x) / SR; x = np.vstack([x, x[: int(tail * SR)]])
        elif 'start' not in E and 'layers' not in E:
            s, _ = alib.best_window(x, SR, L + xf + 0.5); x = x[int(s * SR):]
        if not E.get('raw'): x = alib.make_loop(x, SR, L, xf, tail)
        g =E.get('target', -26) - alib.lufs(x, SR)
        x = limiter(x * 10 ** (g / 20), SR, -3)
        meta = dict(loop=L)
    elif kind == 'note':
        x = trim(x, SR, -45, 0.002, -70, E.get('fout', 0.25), E.get('dur', 4.0))
        if E.get('sus'):
            a, b = E['sus']; A, B, C = int(a * SR), int(b * SR), int(0.35 * SR)
            t = np.linspace(0, 1, C)[:, None]
            x[B - C:B] = x[B - C:B] * np.cos(t * math.pi / 2) + x[A - C:A] * np.sin(t * math.pi / 2)
            x = alib.fade(x[: B + int(0.2 * SR)], SR, 0, 0.2)
            meta['sus'] = [round(a, 4), round(b, 4)]
        g = E.get('target', -16) - alib.momentary(x, SR).max()
        x = limiter(x * 10 ** (g / 20), SR, -1)
        meta['root'] = E['root']
    else:  # sfx
        if not E.get('notrim'): x = trim(x, SR, E.get('trel', -50), 0.003, E.get('post', -58), E.get('fout', 0.04), E.get('maxdur'))
        if E.get('fin'): x = alib.fade(x, SR, E['fin'], 0)
        g = E.get('target', -14) - alib.momentary(x, SR).max()
        x = limiter(x * 10 ** (g / 20), SR, -1)
    # repère de calage : début du fichier = attaque (le lecteur mesure le retard du décodeur MP3)
    e, n = env_db(x, SR); th = e.max() - 40
    meta['on'] = round(int(np.argmax(e > th)) * n / SR, 4)
    path = os.path.join(OUT, E['id'] + '.mp3'); os.makedirs(os.path.dirname(path), exist_ok=True)
    alib.save_mp3(path, x.astype(np.float32), SR, E.get('kbps', 96 if ch == 2 else 80))
    st = alib.stats(x, SR)
    return meta, st


def credits(used):
    lines = ['# Crédits audio — sons enregistrés du jeu', '',
             'Tous les fichiers de `assets/audio/` dérivent de sources **CC0 (domaine public)** — aucune attribution',
             "n'est exigée, mais nous remercions les auteurs. Fabriqués par `tools/audio/build.py` (catalogue :",
             '`tools/audio/catalog.py`) : découpe, filtres, normalisation de sonie (BS.1770), boucles sans couture',
             '(fondu enchaîné), mono pour les effets, encodage MP3 44,1 kHz. Musique : compositions originales jouées',
             'par le jeu avec ces échantillons (`src/03c-music.js`).', '',
             '| Fichier | Source | Auteur | Licence | Modifications |', '|---|---|---|---|---|']
    for E in ENTRIES:
        srcs = [L['src'] for L in (E['layers'] if 'layers' in E else [E])]
        cells = []
        for s in srcs:
            if s[0] == 'fs':
                m = FS_META[s[1]]
                cells.append((f"[freesound #{s[1]}](https://freesound.org/s/{s[1]}/) « {m['title']} »", m['user'], 'CC0 1.0'))
            elif s[0] == 'kenney':
                cells.append((f"[Kenney — {s[1]}](https://kenney.nl/assets/{s[1]}) `{s[2]}`", 'Kenney', 'CC0 1.0'))
            elif s[0] == 'vsco':
                cells.append((f"[VSCO 2 CE](https://github.com/sgossner/VSCO-2-CE) `{s[1]}`", 'Versilian Studios (Sam Gossner)', 'CC0 1.0'))
            else:
                cells.append((f"[VCSL](https://github.com/sgossner/VCSL) `{s[1]}`", 'Versilian Studios (Sam Gossner)', 'CC0 1.0'))
        mods = E.get('note_credit') or {'loop': 'extrait, boucle fondue, sonie −26 LUFS', 'note': 'note isolée, accordée, sonie normalisée', 'sfx': 'découpe, filtres, sonie normalisée'}[E['kind']]
        if 'layers' in E: mods = 'mélange de ' + str(len(srcs)) + ' sources, ' + mods
        for k, (s, a, l) in enumerate(cells):
            lines.append(f"| {('`' + E['id'] + '.mp3`') if k == 0 else '〃'} | {s} | {a} | {l} | {mods if k == 0 else ''} |")
    open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(lines) + '\n')


def main():
    args = sys.argv[1:]
    if args[:1] == ['--events']:
        k, i = args[1].split(':'); src = (k, int(i)) if k == 'fs' else (k, i)
        x = alib.load(fetch(src), SR, 2)
        for j, (a, b) in enumerate(events(x, SR)): print(j, round(a, 2), round(b, 2))
        return
    only = args[1] if args[:1] == ['--only'] else None
    man_path = os.path.join(OUT, 'manifest.json')
    man = json.load(open(man_path)) if (only and os.path.exists(man_path)) else {'v': 1, 'sounds': {}}
    report = []
    for E in ENTRIES:
        if only and E['id'] != only: continue
        meta, st = build_entry(E)
        key = E.get('key', E['id'].split('/')[-1])
        snd = man['sounds'].setdefault(key, {'kind': E['kind'], 'grp': E['grp'], 'takes': []})
        snd['takes'] = [t for t in snd['takes'] if t['f'] != E['id'] + '.mp3']
        snd['takes'].append(dict(f=E['id'] + '.mp3', **meta))
        snd['takes'].sort(key=lambda t: t['f'])
        if E.get('vol') is not None: snd['vol'] = E['vol']
        report.append(f"{E['id']:28s} {st['dur']:6.2f}s pk {st['peak_db']:5.1f} I {st['lufs']:6.1f} M {st['mmax']:6.1f}")
    man['bytes'] = sum(os.path.getsize(os.path.join(OUT, t['f'])) for s in man['sounds'].values() for t in s['takes'])
    json.dump(man, open(man_path, 'w'), indent=0, ensure_ascii=False, sort_keys=True)
    credits(None)
    print('\n'.join(report)); print('total', round(man['bytes'] / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
