#!/usr/bin/env python3
"""tools/voice/gen.py — synthèse INCRÉMENTALE de la voix off (voir tools/voice/README.md).

  python tools/voice/gen.py [--langs fr,en] [--limit N] [--dry] [--force]

Lit tools/voice/lines.json (inventaire de tools/voice/extract.mjs) et tools/voice/cast.json (distribution),
synthétise UNIQUEMENT les répliques manquantes (ou dont la voix a changé dans cast.json), les traite avec
ffmpeg (silences rognés, hauteur, effets machine, normalisation EBU R128 en deux passes), les encode en MP3
mono et écrit :
  assets/voice/<langue>/<empreinte>.mp3
  assets/voice/<langue>/index.json   {"v":1, "lang":…, "lines":{empreinte: durée s}}
Les fichiers orphelins (texte réécrit ou supprimé) sont effacés. Moteurs : kokoro (PyTorch), piper (onnx),
chargés à la demande ; un moteur absent laisse la langue intacte (message clair).
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = os.path.join(ROOT, 'tools', 'voice')
CACHE = os.environ.get('AGI_VOICE_CACHE', os.path.join(VOICE, '.cache'))
OUT = os.path.join(ROOT, 'assets', 'voice')
STATE = os.path.join(VOICE, 'state.json')
os.environ.setdefault('HF_HOME', os.path.join(CACHE, 'hf'))

def load(p, d=None):
    try:
        with open(p, encoding='utf-8') as f: return json.load(f)
    except FileNotFoundError: return d

def dump(p, o, compact=False):
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(o, f, ensure_ascii=False, indent=None if compact else 1, sort_keys=True, separators=(',', ':') if compact else None)
        f.write('\n')
    os.replace(tmp, p)

def tts_text(s):
    """Texte prêt à dire : majuscules de « NOUS » → casse de phrase (sinon lues comme des sigles),
    guillemets et tirets simplifiés."""
    letters = [c for c in s if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.7:
        s = s.lower()
        s = re.sub(r'(^|[.!?…]\s+|[«“"]\s*)(\w)', lambda m: m.group(1) + m.group(2).upper(), s)
    s = s.replace('«', '"').replace('»', '"').replace('“', '"').replace('”', '"').replace('„', '"')
    s = re.sub(r'\s*—\s*', ', ', s)
    s = s.replace('…', '...')
    return re.sub(r'\s+', ' ', s).strip()

# ---------------- moteurs ----------------
class Kokoro:
    def __init__(self):
        from kokoro import KPipeline  # noqa
        self.KPipeline, self.pipes = KPipeline, {}
    def say(self, text, v):
        import numpy as np
        code = v.get('code', 'a')
        if code not in self.pipes: self.pipes[code] = self.KPipeline(lang_code=code, repo_id='hexgrad/Kokoro-82M')
        parts = [a.numpy() if hasattr(a, 'numpy') else a for _, _, a in self.pipes[code](text, voice=v['voice'], speed=v.get('speed', 1.0), split_pattern=r'\n+')]
        parts = [p for p in parts if p is not None]
        return (np.concatenate(parts) if parts else np.zeros(2400, dtype='float32')), 24000

class Piper:
    def __init__(self):
        from piper import PiperVoice, SynthesisConfig  # noqa
        self.PV, self.Cfg, self.models = PiperVoice, SynthesisConfig, {}
    def say(self, text, v):
        import numpy as np
        m = v['model']
        if m not in self.models: self.models[m] = self.PV.load(os.path.join(CACHE, 'piper', m + '.onnx'))
        voice = self.models[m]; sp = v.get('speaker')
        if isinstance(sp, str): sp = voice.config.speaker_id_map.get(sp, 0)
        cfg = self.Cfg(speaker_id=sp, length_scale=v.get('length', 1.0), noise_scale=v.get('noise', 0.6), noise_w_scale=v.get('noise_w', 0.8))
        ch = list(voice.synthesize(text, syn_config=cfg))
        return np.concatenate([c.audio_float_array for c in ch]), ch[0].sample_rate

ENGINES = {}
def engine(name):
    if name not in ENGINES:
        ENGINES[name] = {'kokoro': Kokoro, 'piper': Piper}[name]()
    return ENGINES[name]

# ---------------- traitement ffmpeg ----------------
def ff(args, capture=False):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y'] + args, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-800:])
    return r.stderr

def process(wav_in, mp3_out, v, cast, sr):
    """rognage des silences, hauteur, effet, loudnorm deux passes, mp3 mono ; renvoie la durée (s)."""
    mp3 = cast['mp3']; rate = mp3.get('rate', 24000); lufs = mp3.get('lufs', -17)
    chain = ['silenceremove=start_periods=1:start_silence=0.04:start_threshold=-48dB', 'areverse',
             'silenceremove=start_periods=1:start_silence=0.08:start_threshold=-48dB', 'areverse']
    p = float(v.get('pitch', 0))
    if p:
        k = 2 ** (p / 12)
        chain += [f'asetrate={sr * k:.0f}', f'aresample={sr}', f'atempo={1 / k:.5f}']
    fx = v.get('fx')
    if fx: chain.append(cast['fx'][fx])
    chain += ['adelay=70', 'apad=pad_dur=0.18']
    base = ','.join(chain)
    st = ff(['-i', wav_in, '-af', base + f',loudnorm=I={lufs}:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'])
    m = json.loads(st[st.rfind('{'):st.rfind('}') + 1])
    ln = (f"loudnorm=I={lufs}:TP=-1.5:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    tmp = mp3_out + '.wav'
    ff(['-i', wav_in, '-af', base + ',' + ln + f',aresample={rate}', '-ac', '1', '-ar', str(rate), '-c:a', 'pcm_s16le', tmp])
    import soundfile as sf
    info = sf.info(tmp); dur = info.frames / info.samplerate
    ff(['-i', tmp, '-c:a', 'libmp3lame', '-b:a', mp3.get('bitrate', '32k'), '-ac', '1', '-ar', str(rate), '-map_metadata', '-1', '-write_xing', '1', mp3_out])
    os.remove(tmp)
    return round(dur, 2)

def voice_for(cast, who, lang):
    sp = cast['speakers'].get(who) or cast['speakers']['_default']
    if 'same' in sp: sp = cast['speakers'][sp['same']]
    return sp.get(lang)

def fingerprint(v, cast):
    fx = cast['fx'].get(v.get('fx')) if v.get('fx') else None
    return hashlib.sha1(json.dumps([v, fx, cast['mp3']], sort_keys=True).encode()).hexdigest()[:10]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--langs', default=None)
    ap.add_argument('--limit', type=int, default=0, help='au plus N répliques par langue (essai)')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    if not shutil.which('ffmpeg'): sys.exit('ffmpeg introuvable (apt install ffmpeg)')
    man = load(os.path.join(VOICE, 'lines.json')); cast = load(os.path.join(VOICE, 'cast.json'))
    if not man: sys.exit('tools/voice/lines.json absent : lancez d\'abord node tools/voice/extract.mjs')
    langs = a.langs.split(',') if a.langs else [l for l in man['langs'] if cast['engines'].get(l)]
    state = load(STATE, {})
    total_t = time.time()
    for lang in langs:
        t0 = time.time(); d = os.path.join(OUT, lang); os.makedirs(d, exist_ok=True)
        lines = [l for l in man['lines'] if l['lang'] == lang]
        st = state.setdefault(lang, {}); idx = (load(os.path.join(d, 'index.json'), {}) or {}).get('lines', {})
        todo, keep = [], {}
        for l in lines:
            v = voice_for(cast, l['who'], lang)
            if not v: continue
            fp = fingerprint(v, cast); f = os.path.join(d, l['hash'] + '.mp3')
            if not a.force and os.path.exists(f) and st.get(l['hash']) == fp and l['hash'] in idx: keep[l['hash']] = idx[l['hash']]
            else: todo.append((l, v, fp))
        if a.limit: todo = todo[:a.limit]
        print(f'▶ {lang} : {len(lines)} répliques, {len(keep)} à jour, {len(todo)} à synthétiser', flush=True)
        if a.dry: continue
        made = 0; audio_s = 0.0
        with tempfile.TemporaryDirectory() as tmpd:
            for l, v, fp in todo:
                try:
                    eng = engine(v['engine'])
                except Exception as e:
                    print(f'  ✗ moteur {v["engine"]} indisponible ({e}) : {lang} laissé tel quel'); break
                import soundfile as sf
                audio, sr = eng.say(tts_text(l['text']), v)
                w = os.path.join(tmpd, 'raw.wav'); sf.write(w, audio, sr)
                dur = process(w, os.path.join(d, l['hash'] + '.mp3'), v, cast, sr)
                keep[l['hash']] = dur; st[l['hash']] = fp; made += 1; audio_s += dur
                if made % 10 == 0:
                    print(f'  {made}/{len(todo)} ({time.time() - t0:.0f} s)', flush=True)
                    dump(os.path.join(d, 'index.json'), {'v': 1, 'lang': lang, 'lines': keep}, True); dump(STATE, state)
        # orphelins : tout mp3 qui n'est plus une réplique actuelle
        valid = {l['hash'] for l in lines}
        gone = 0
        for fn in os.listdir(d):
            h = fn[:-4] if fn.endswith('.mp3') else None
            if h and (h not in valid or h not in keep): os.remove(os.path.join(d, fn)); keep.pop(h, None); st.pop(h, None); gone += 1
        for h in list(st):
            if h not in keep: st.pop(h)
        keep = {h: keep[h] for h in keep if h in valid}
        dump(os.path.join(d, 'index.json'), {'v': 1, 'lang': lang, 'lines': keep}, True); dump(STATE, state)
        size = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d))
        print(f'✔ {lang} : {made} synthétisées ({audio_s / 60:.1f} min), {gone} orphelines effacées, {len(keep)} répliques, '
              f'{sum(keep.values()) / 60:.1f} min, {size / 1e6:.2f} Mo — {time.time() - t0:.0f} s', flush=True)
    print(f'terminé en {time.time() - total_t:.0f} s')

if __name__ == '__main__':
    main()
