# tools/voice — voix off des cinématiques et de la radio

Pipeline hors ligne : **inventaire des répliques → synthèse neuronale → MP3 + index**, lu en jeu
par `src/16c0-voice.js`. Incrémental : seules les répliques nouvelles ou réécrites (ou dont la voix
a changé dans `cast.json`) sont synthétisées ; les fichiers orphelins sont effacés.

```
src/*  ──npm run dev──▶ la-derniere-bataille.html ──extract.mjs──▶ lines.json ──gen.py──▶ assets/voice/<lang>/<hash>.mp3
                                                                   cast.json ──┘                    assets/voice/<lang>/index.json
```

| Fichier | Rôle |
|---|---|
| `extract.mjs` | lance le jeu (Playwright) et appelle les fabriques de scripts de chaque mission (intro, outro victoire/défaite + branches de choix, radio, cinématiques en mission, fins), à chaque niveau et doctrine, dans les 9 langues ; + inventaire statique (acorn) des répliques déclenchées en cours de partie ; + gabarits (renforts). Écrit `lines.json` : `{lang, who, text, hash}`. `--check` : vérifie qu'il est à jour. |
| `hash.mjs` | empreinte `FNV-1a 32 bits("lang|who|texte")` en hex — identique à `voiceKey()` du jeu. |
| `cast.json` | distribution : pour chaque voix (`who`) et chaque langue, moteur + voix + vitesse + hauteur + effet. Ajouter un personnage = ajouter une entrée (sinon `_default` = voix du narrateur). |
| `gen.py` | synthèse incrémentale, ffmpeg (silences rognés, hauteur, effets « bipeur / machine / synthétique », EBU R128 deux passes à −17 LUFS), MP3 mono 24 kHz 32 kb/s, `index.json` (hash → durée). |
| `state.json` | empreinte de configuration de chaque réplique générée (pour régénérer quand la voix change). |

## Installer (une fois, ~2 Go dans `tools/voice/.cache/`, ignoré par git)

```bash
uv venv tools/voice/.cache/venv --python 3.11          # ou python3.11 -m venv …
uv pip install --python tools/voice/.cache/venv/bin/python torch --index-url https://download.pytorch.org/whl/cpu
uv pip install --python tools/voice/.cache/venv/bin/python "kokoro>=0.9.4" "misaki[zh]>=0.9.4" soundfile piper-tts numpy
# voix Piper (de, ru) : modèles .onnx + .onnx.json de huggingface.co/rhasspy/piper-voices dans tools/voice/.cache/piper/
#   de_DE-thorsten-high, de_DE-thorsten_emotional-medium, de_DE-kerstin-medium, ru_RU-denis-medium, ru_RU-dmitri-medium
# ffmpeg avec libmp3lame est requis (apt install ffmpeg)
```
Kokoro télécharge son modèle (hexgrad/Kokoro-82M, ~330 Mo) dans `tools/voice/.cache/hf` au premier lancement.

## Régénérer (après une réécriture des textes)

```bash
npm run dev
node tools/voice/extract.mjs                                     # ~10 s
tools/voice/.cache/venv/bin/python tools/voice/gen.py --langs fr # seulement ce qui a changé
node tools/test-voice.mjs
```
`gen.py` sans `--langs` traite toutes les langues dont `cast.json → engines` a un moteur.
`--dry` : compte ce qui serait synthétisé ; `--force` : tout refaire ; `--limit N` : essai.

Temps mesurés (4 cœurs CPU, sans GPU) : français ≈ 125 répliques, 16 min d'audio → voir le
rapport de génération ci-dessous. Une réécriture partielle ne refait que les répliques changées.

## Moteurs et licences (audio généré redistribuable, usage commercial)

| Langues | Moteur | Voix | Licence |
|---|---|---|---|
| fr en es it pt zh | **Kokoro-82M** (hexgrad) | voix intégrées (ff_siwis, bm_george, bm_daniel, am_fenrir, am_michael, af_heart…) | Apache-2.0 (modèle et voix). ff_siwis dérive du corpus SIWIS (CC-BY 4.0) : créditer « SIWIS French Speech Synthesis Database ». |
| de ru | **Piper** (outil de génération seulement, non distribué) | thorsten, thorsten_emotional, kerstin (CC0) ; denis, dmitri (CC0) | voix CC0 — vérifié dans chaque MODEL_CARD |
| ar | — | aucune voix arabe Piper sous licence claire (kareem : « See URL », dépôt sans licence) | non généré |

Écartées : fr_FR-upmc (CC-BY-SA), fr_FR-tom (AGPL), ru_RU-ruslan (CC-BY-NC-SA), ru_RU-irina (licence inconnue),
de_DE-pavoque (CC-BY-NC-SA), XTTS/F5/MMS (non commerciales). fr_FR-mls produit un audio inintelligible.
Le russe n'a que des voix d'homme sous licence libre : Sol y aurait une voix masculine — à revoir
(piste : Chatterbox multilingue, MIT, clonage depuis une voix Kokoro, mais lent sur CPU).

Français : Kokoro n'a qu'une voix française native (ff_siwis = Sol). Les autres personnages utilisent des
voix anglaises de Kokoro prononçant la phonétique française (espeak) : intelligibles (taux d'erreur de
transcription Whisper 12–16 % contre 12 % pour ff_siwis) mais avec un léger accent.

## Effets

- **À la génération** (ffmpeg, `cast.json → fx`) : `pager` (Kassandre, bipeur : bande limitée, bits réduits),
  `machine` (« NOUS » : grave, modulation d'amplitude 46 Hz, chorus, écho métallique), `synth` (porte-parole).
- **À la lecture** (WebAudio, `src/16c0-voice.js`) : transmissions radio en mission = passe-bande + saturation ;
  la musique est baissée pendant chaque réplique.

## Distribution

`build.mjs` copie `assets/` dans `www/assets/` (web, Android, PC). Le fichier unique
`la-derniere-bataille.html` ouvert en `file://` dans un navigateur ne peut pas lire ces fichiers :
la voix y est simplement absente (aucune erreur). Electron (file://) tente un XHR local.
