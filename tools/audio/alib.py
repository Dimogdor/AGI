"""alib.py — petite boîte à outils d'analyse/traitement audio (numpy + ffmpeg).

Utilisée par tools/audio/build.py (fabrication des sons du jeu) et pour les audits.
  load(path, sr, ch)   décode n'importe quel fichier via ffmpeg → float32 (n, ch)
  save_mp3(path, x, sr, kbps)  encode en MP3 (libmp3lame)
  lufs(x, sr)          sonie intégrée ITU-R BS.1770-4 (porte absolue −70, relative −10)
  momentary(x, sr)     sonie momentanée (fenêtres 400 ms, pas 100 ms)
  stats(x, sr)         crête, sonie, DC, écrêtage, centroïde, largeur de bande, stabilité…
"""
import subprocess, json, math
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

FFMPEG = 'ffmpeg'


def load(path, sr=48000, ch=1, start=None, dur=None):
    cmd = [FFMPEG, '-v', 'error']
    if start is not None: cmd += ['-ss', str(start)]
    if dur is not None: cmd += ['-t', str(dur)]
    cmd += ['-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', str(ch), '-ar', str(sr), '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).astype(np.float64)


def save_mp3(path, x, sr, kbps=96, extra=None):
    x = np.asarray(x, dtype=np.float32)
    if x.ndim == 1: x = x[:, None]
    ch = x.shape[1]
    cmd = [FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-',
           '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ar', str(sr)]
    if ch == 2: cmd += ['-joint_stereo', '1']
    cmd += (extra or []) + ['-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', path]
    subprocess.run(cmd, input=np.clip(x, -1, 1).tobytes(), check=True)


def save_wav(path, x, sr):
    x = np.asarray(x, dtype=np.float32)
    if x.ndim == 1: x = x[:, None]
    cmd = [FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(x.shape[1]), '-i', '-', '-c:a', 'pcm_s16le', path]
    subprocess.run(cmd, input=np.clip(x, -1, 1).tobytes(), check=True)


# ---- K-weighting (BS.1770), coefficients computed for any sample rate (same as pyloudnorm) ----
def _kfilters(sr):
    # high shelf
    G, Q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    A = 10 ** (G / 40.0); w0 = 2 * math.pi * fc / sr; alpha = math.sin(w0) / (2 * Q)
    b0 = A * ((A + 1) + (A - 1) * math.cos(w0) + 2 * math.sqrt(A) * alpha)
    b1 = -2 * A * ((A - 1) + (A + 1) * math.cos(w0))
    b2 = A * ((A + 1) + (A - 1) * math.cos(w0) - 2 * math.sqrt(A) * alpha)
    a0 = (A + 1) - (A - 1) * math.cos(w0) + 2 * math.sqrt(A) * alpha
    a1 = 2 * ((A - 1) - (A + 1) * math.cos(w0))
    a2 = (A + 1) - (A - 1) * math.cos(w0) - 2 * math.sqrt(A) * alpha
    shelf = (np.array([b0, b1, b2]) / a0, np.array([a0, a1, a2]) / a0)
    # high pass
    Q, fc = 0.5003270373238773, 38.13547087602444
    w0 = 2 * math.pi * fc / sr; alpha = math.sin(w0) / (2 * Q)
    b = np.array([1, -2, 1]) * 1.0
    a0 = 1 + alpha; a = np.array([a0, -2 * math.cos(w0), 1 - alpha])
    hp = (b / a0, a / a0)
    return shelf, hp


def kweight(x, sr):
    (b1, a1), (b2, a2) = _kfilters(sr)
    y = lfilter(b1, a1, x, axis=0)
    return lfilter(b2, a2, y, axis=0)


def _block_loud(xk, sr, win=0.4, hop=0.1):
    n, w, h = len(xk), int(win * sr), int(hop * sr)
    if n < w:  # trop court : un seul bloc (bourré de zéros) → comparable entre SFX courts
        xk = np.vstack([xk, np.zeros((w - n, xk.shape[1]))]); n = w
    p = xk ** 2
    cs = np.vstack([np.zeros((1, p.shape[1])), np.cumsum(p, axis=0)])
    starts = np.arange(0, n - w + 1, h)
    z = (cs[starts + w] - cs[starts]) / w            # puissance moyenne par canal
    zs = z.sum(axis=1)                               # canaux G=1 (pas de surround ici)
    with np.errstate(divide='ignore'):
        return -0.691 + 10 * np.log10(np.maximum(zs, 1e-20)), zs


def lufs(x, sr):
    L, zs = _block_loud(kweight(x, sr), sr)
    m = L > -70
    if not m.any(): return -99.0
    rel = -0.691 + 10 * math.log10(zs[m].mean()) - 10
    m2 = m & (L > rel)
    return -0.691 + 10 * math.log10(zs[m2].mean()) if m2.any() else -99.0


def momentary(x, sr):
    return _block_loud(kweight(x, sr), sr)[0]


def shortterm(x, sr):
    return _block_loud(kweight(x, sr), sr, 3.0, 0.5)[0]


def db(v): return 20 * math.log10(max(v, 1e-12))


def stats(x, sr):
    mono = x.mean(axis=1)
    pk = float(np.abs(x).max())
    M = momentary(x, sr)
    S = shortterm(x, sr) if len(x) > 3 * sr else M
    spec = np.abs(np.fft.rfft(mono[: min(len(mono), sr * 30)] * np.hanning(min(len(mono), sr * 30)))) ** 2
    f = np.fft.rfftfreq(min(len(mono), sr * 30), 1 / sr)
    cum = np.cumsum(spec) / max(spec.sum(), 1e-20)
    cen = float((f * spec).sum() / max(spec.sum(), 1e-20))
    bw99 = float(f[np.searchsorted(cum, 0.99)])
    low = float(spec[f < 120].sum() / max(spec.sum(), 1e-20))
    Sg = S[S > -70]
    return dict(dur=round(len(x) / sr, 2), peak_db=round(db(pk), 1), lufs=round(lufs(x, sr), 1),
                mmax=round(float(M.max()), 1), dc=round(float(np.abs(x.mean(axis=0)).max()), 5),
                clip=int((np.abs(x) > 0.999).sum()), centroid=int(cen), bw99=int(bw99), low120=round(low, 3),
                st_std=round(float(Sg.std()) if len(Sg) else 0, 2), st_range=round(float(Sg.max() - Sg.min()) if len(Sg) else 0, 1))


def fade(x, sr, fin=0.0, fout=0.0):
    x = x.copy(); n = len(x)
    if fin > 0:
        k = min(n, int(fin * sr)); x[:k] *= (np.sin(np.linspace(0, math.pi / 2, k)) ** 2)[:, None]
    if fout > 0:
        k = min(n, int(fout * sr)); x[n - k:] *= (np.cos(np.linspace(0, math.pi / 2, k)) ** 2)[:, None]
    return x


def highpass(x, sr, f, order=2):
    sos = butter(order, f, 'highpass', fs=sr, output='sos'); return sosfilt(sos, x, axis=0)


def lowpass(x, sr, f, order=2):
    sos = butter(order, f, 'lowpass', fs=sr, output='sos'); return sosfilt(sos, x, axis=0)


def make_loop(x, sr, length, xfade, tail):
    """Boucle sans couture : prend `length + xfade` s de x, fond la fin dans le début (puissance
    constante), puis ajoute `tail` s recopiées du début (pour le fondu à la lecture : le lecteur
    du jeu enchaîne une nouvelle instance à t = length, les deux signaux sont alors identiques)."""
    L, C, T = int(length * sr), int(xfade * sr), int(tail * sr)
    seg = x[: L + C].copy()
    t = np.linspace(0, 1, C)[:, None]
    head = seg[:C] * np.sin(t * math.pi / 2) + seg[L:L + C] * np.cos(t * math.pi / 2)
    loop = np.vstack([head, seg[C:L]])
    return np.vstack([loop, loop[:T]])


def best_window(x, sr, length, hop=0.5):
    """Fenêtre de `length` s la plus stable (écart-type de sonie court terme minimal, sans pic)."""
    M = momentary(x, sr)                     # pas de 100 ms
    w = int(length * 10); best, bi = 1e9, 0
    for i in range(0, max(1, len(M) - w), int(hop * 10)):
        seg = M[i:i + w]; seg = seg[seg > -70]
        if len(seg) < w * 0.9: continue
        score = seg.std() + 0.35 * max(0, seg.max() - np.median(seg) - 6)
        if score < best: best, bi = score, i
    return bi / 10.0, best


def pitch(x, sr, fmin=60, fmax=1500):
    """Fréquence fondamentale (autocorrélation sur la partie tenue, après l'attaque)."""
    m = x.mean(axis=1) if x.ndim > 1 else x
    a = int(0.08 * sr); seg = m[a:a + int(0.5 * sr)]
    if len(seg) < 2048: seg = m[: int(0.5 * sr)]
    seg = seg - seg.mean(); n = len(seg)
    spec = np.fft.rfft(seg, 2 * n); ac = np.fft.irfft(np.abs(spec) ** 2)[:n]
    lo, hi = int(sr / fmax), int(sr / fmin)
    i = lo + int(np.argmax(ac[lo:hi]))
    # raffinement parabolique
    if 0 < i < n - 1:
        y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]; d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-20); i = i + d
    return sr / i


def midi_of(f): return 69 + 12 * math.log2(f / 440.0)
