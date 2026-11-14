"""catalog.py — catalogue des sons du jeu : source CC0 → fichier assets/audio/<id>.mp3.

Champs : id (chemin de sortie), key (nom lu par le jeu ; plusieurs entrées = plusieurs prises),
kind (sfx | loop | note), grp (lot de chargement), src (+ start/dur/ev/pitch/hp/lp/gain) ou layers,
target (sonie : max momentané pour sfx/note, intégrée pour loop), ch (1 mono, 2 stéréo), len (boucle).
Lots : core (interface, combat, héros — chargé au premier geste), amb_<lieu> (au lancement d'une
mission ou d'une escarmouche), mus_<instrument> (quand un thème en a besoin).
"""
import json, os
FS_META = {int(k): v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fs_meta.json'))).items()}

K = lambda pack, f: ('kenney', pack, f)
V = lambda p: ('vsco', p)
VC = lambda p: ('vcsl', p)
FS = lambda i: ('fs', i)

E = []
def sfx(id, src, key=None, grp='core', **kw): E.append(dict(id='sfx/' + id, key=key, kind='sfx', grp=grp, src=src, **kw))
def mix(id, layers, key=None, grp='core', **kw): E.append(dict(id='sfx/' + id, key=key, kind='sfx', grp=grp, layers=layers, **kw))
def loop(id, src, grp, len=16, ch=2, **kw): E.append(dict(id='amb/' + id, key=id, kind='loop', grp=grp, src=src, len=len, ch=ch, kbps=80 if ch == 2 else 56, **kw))
def note(id, key, src, root, grp, **kw): E.append(dict(id='mus/' + id, key=key, kind='note', grp=grp, src=src, root=root, kbps=64, **kw))

# ---------------------------------------------------------------- interface
for i in (1, 2, 3): sfx(f'ui_click{i}', K('interface-sounds', f'click_00{i}.ogg'), 'ui_click', target=-22)
for i in (1, 2): sfx(f'ui_buy{i}', K('interface-sounds', f'select_00{i}.ogg'), 'ui_buy', target=-20)
for i in (1, 2): sfx(f'ui_ok{i}', K('interface-sounds', f'confirmation_00{i}.ogg'), 'ui_ok', target=-19)
for i in (1, 4): sfx(f'ui_deny{i}', K('interface-sounds', f'error_00{i}.ogg'), 'ui_deny', target=-19)
sfx('ui_radio', K('interface-sounds', 'bong_001.ogg'), 'ui_radio', target=-21)
sfx('ui_page1', FS(667180), 'ui_page', target=-22)
sfx('ui_page2', K('rpg-audio', 'bookFlip1.ogg'), 'ui_page', target=-22)

# ---------------------------------------------------------------- armes (par ère)
sfx('shot_old1', FS(410442), 'shot_old', hp=90, maxdur=1.4, target=-13)
sfx('shot_old2', FS(234869), 'shot_old', start=0.6, hp=90, maxdur=1.4, target=-13)
sfx('shot_old3', FS(538795), 'shot_old', hp=90, maxdur=1.2, target=-13)
sfx('shot_rifle1', FS(855655), 'shot_rifle', hp=110, maxdur=0.9, target=-13)
sfx('shot_rifle2', FS(427598), 'shot_rifle', hp=110, maxdur=0.8, target=-13)
sfx('shot_gauss1', FS(785380), 'shot_gauss', hp=120, maxdur=0.8, target=-14)
sfx('shot_gauss2', FS(785380), 'shot_gauss', pitch=-2.5, hp=120, maxdur=0.9, target=-14)
for i in (0, 1):
    mix(f'shot_plasma{i+1}', [dict(src=K('sci-fi-sounds', f'laserLarge_00{i}.ogg'), hp=150),
                              dict(src=FS(528816), gain=-5, pitch=3, lp=900)], 'shot_plasma', maxdur=0.8, target=-14)
for i in (0, 1, 2): sfx(f'shot_laser{i+1}', K('sci-fi-sounds', f'laserSmall_00{i}.ogg'), 'shot_laser', target=-16)
for i in (3, 4): sfx(f'shot_laserH{i-2}', K('sci-fi-sounds', f'laserLarge_00{i}.ogg'), 'shot_laserH', target=-15)
sfx('shot_mortar1', FS(448002), 'shot_mortar', hp=60, maxdur=2.2, fout=0.6, target=-13)
# ---------------------------------------------------------------- explosions, coups, chantier
sfx('boom1', FS(609587), 'boom', hp=35, maxdur=2.6, fout=0.8, target=-11)
sfx('boom2', FS(563010), 'boom', hp=35, maxdur=2.6, fout=0.8, target=-11)
sfx('boom3', FS(840508), 'boom', hp=35, maxdur=2.6, fout=0.8, target=-11)
sfx('boom_big1', FS(231765), 'boom_big', hp=30, maxdur=3.5, fout=1.0, target=-10)
sfx('boom_far1', FS(320788), 'boom_far', ev=1, hp=30, lp=900, maxdur=3.0, fout=1.0, target=-18)
sfx('boom_far2', FS(320788), 'boom_far', ev=4, hp=30, lp=900, maxdur=3.0, fout=1.0, target=-18)
sfx('boom_far3', FS(320788), 'boom_far', ev=6, hp=30, lp=900, maxdur=3.0, fout=1.0, target=-18)
mix('spec1', [dict(src=FS(231765), hp=30), dict(src=FS(528816), gain=-3, pitch=-5)], 'spec', maxdur=3.5, fout=1.0, target=-10)
for i in (0, 1, 2): sfx(f'die{i+1}', K('impact-sounds', f'impactPunch_heavy_00{i}.ogg'), 'die', target=-19)
for i in (0, 1): sfx(f'build{i+1}', K('impact-sounds', f'impactPlank_medium_00{i}.ogg'), 'build', target=-16)
sfx('build3', K('impact-sounds', 'impactWood_heavy_000.ogg'), 'build', target=-16)
sfx('build4', FS(707525), 'build', start=1.0, dur=0.6, hp=80, target=-16)
sfx('blade1', FS(326868), 'blade', target=-15)
sfx('blade2', FS(334169), 'blade', target=-15)

# ---------------------------------------------------------------- héros : le Che (voix humaines CC0)
for i, s in enumerate((521830, 521831, 521832)): sfx(f'che_cry{i+1}', FS(s), 'che_cry', hp=90, target=-14)
sfx('che_hurt1', FS(464486), 'che_hurt', hp=90, target=-16)
sfx('che_hurt2', FS(547209), 'che_hurt', hp=90, target=-16)
mix('che_death1', [dict(src=FS(464486), pitch=-3, hp=80), dict(src=FS(504626), at=0.32, gain=-4)], 'che_death', target=-15, fout=0.4)
sfx('whistle1', FS(218318), 'whistle', start=0.05, dur=1.3, target=-20, fout=0.15)
# ---------------------------------------------------------------- héros : la Singularité (sons de synthèse et de machine)
sfx('ia_servo1', FS(875419), 'ia_servo', target=-18)
sfx('ia_servo2', FS(687150), 'ia_servo', ev=0, target=-18, maxdur=1.4, fout=0.2)
sfx('ia_glitch1', FS(90335), 'ia_glitch', ev=1, target=-17)
sfx('ia_glitch2', FS(832725), 'ia_glitch', target=-17)
sfx('ia_glitch3', FS(341286), 'ia_glitch', target=-18, maxdur=1.0, fout=0.2)
sfx('ia_up1', FS(375925), 'ia_up', target=-15)
sfx('ia_down1', FS(238367), 'ia_down', start=0.25, target=-15, maxdur=3.0, fout=0.6)
sfx('ia_down2', FS(443465), 'ia_down', target=-15)
sfx('ia_field1', K('sci-fi-sounds', 'forceField_000.ogg'), 'ia_field', target=-17)
sfx('ia_noise1', K('sci-fi-sounds', 'computerNoise_000.ogg'), 'ia_noise', target=-20)

# ---------------------------------------------------------------- AMBIANCES (boucles stéréo) par lieu
# I · Valmont, nuit, pluie
loop('cityrain', FS(452442), 'amb_night', len=18)                       # balcon, ville mouillée la nuit
loop('rainroof', FS(451152), 'amb_night', len=16)                       # pluie fine sur tôle
loop('rainstreet', FS(380651), 'amb_rain', len=18, hp=160)               # pluie sur la rue (aussi : escarmouche)
loop('hum', FS(349696), 'amb_night', len=10, ch=1, hp=40)               # transformateur qui grésille
sfx('thunder1', FS(473864), 'thunder', grp='amb_night', ev=0, maxdur=11, fout=3.0, hp=25, target=-22)
sfx('dog1', FS(573146), 'dog', grp='amb_night', ev=3, lp=2500, target=-30)
sfx('dog2', FS(573146), 'dog', grp='amb_night', ev=5, lp=2500, target=-30)
# II · le port à l'aube, la grève
loop('harbour', FS(450529), 'amb_port', len=18)                         # rue du port à 6 h, mouettes
loop('lap', FS(637945), 'amb_port', len=14)                             # clapotis contre les coques
loop('dawn', FS(518670), 'amb_port', len=18)                            # chœur de l'aube, océan au loin
loop('crowd', FS(580301), 'amb_port', len=14, lp=3200)                  # la foule (rumeur, sans paroles)
loop('chant', FS(485621), 'amb_port', len=16, lp=1400, hp=120)          # cortège qui scande, au loin (paroles inintelligibles)
E.append(dict(id='amb/march', key='march', kind='loop', grp='amb_port', src=FS(240732), len=8.0, raw=True, ch=2, kbps=80))
sfx('gull1', FS(507380), 'gull', grp='amb_port', start=0.0, dur=4.0, target=-24, fout=0.6)
sfx('gull2', FS(637813), 'gull', grp='amb_port', ev=0, maxdur=4.5, target=-24, fout=0.6)
sfx('horn1', FS(507471), 'horn', grp='amb_port', target=-24, fout=1.5)
# III · le barrage (sécheresse, crue)
loop('river', FS(660252), 'amb_dam', len=16)
loop('falls', FS(690223), 'amb_dam', len=18)                            # grondement d'une grande chute, de loin
loop('gush', FS(453676), 'amb_dam', len=12)                             # vanne ouverte
loop('cicadas', FS(320113), 'amb_dam', len=14, hp=1500)
loop('wind', FS(688841), 'amb_wind', len=20)                            # vent (aussi : escarmouche, citadelle)
# IV · Rochefroide, blizzard
loop('blizzard', FS(505999), 'amb_cold', len=20)
loop('howl', FS(575243), 'amb_cold', len=18)
loop('fire', FS(563764), 'amb_fire', len=14)                             # brasero (aussi : escarmouche, feux)
for k, ev in enumerate((2, 3, 5)): sfx(f'gust{k+1}', FS(459981), 'gust', grp='amb_cold', ev=ev, target=-21, fin=0.4, fout=0.8, evtail=0.6)
# V · la citadelle
loop('server', FS(429188), 'amb_citadel', len=14, start=2.0)
loop('cityhum', FS(572530), 'amb_citadel', len=18, hp=30)
# escarmouche : oiseaux d'un monde encore sain
loop('birds', FS(274175), 'amb_sk', len=18)

# ---------------------------------------------------------------- INSTRUMENTS (notes isolées, accordées)
G = 'mus_gtr'
for f, r, d in ((785484, 40.19, 6.0), (785491, 52.13, 5.0), (785490, 56.95, 5.5), (785489, 59.24, 5.5), (785487, 61.92, 5.5)):
    note(f'gtr_{f}', 'gtr', FS(f), r, G, dur=d, fout=1.2, target=-15)
note('gtr_harm', 'gtrh', FS(785492), 87.98, G, dur=4.0, fout=1.0, target=-18)
P = 'Keys/Upright Piano/Player_dyn2_rr1_0'
for n, r in (('06', 32.97), ('10', 41.05), ('14', 48.99), ('18', 57.02), ('22', 65.02), ('26', 73.05), ('30', 81.07)):
    note(f'pno_{n}', 'pno', V(P + n + '.wav'), r, 'mus_pno', dur=6.0, fout=1.5, target=-15)
for n, r in (('A2', 56.98), ('A3', 69.03), ('C4', 72.01), ('B4', 83.01)):
    note(f'vln_{n}', 'vln', V(f'Strings/Violin Section/susVib/VlnEns_susVib_{n}_v1.wav'), r, 'mus_str', dur=4.6, sus=[1.4, 4.2], target=-17)
for n, r in (('C1', 36.02), ('G1', 42.95), ('D2', 50.04), ('A2', 56.99), ('E3', 63.98)):
    note(f'vc_{n}', 'vc', V(f'Strings/Cello Section/susvib/susvib_{n}_v1_1.wav'), r, 'mus_str', dur=4.6, sus=[1.4, 4.2], target=-17)
for n, v, r in (('E0', 3, 28), ('C1', 3, 36), ('E1', 3, 40), ('A1', 1, 45)):
    note(f'cb_{n}', 'pizz', V(f'Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_{n}_v{v}_rr1.wav'), r, 'mus_str', dur=2.5, fout=0.6, target=-15)
for n, r in (('D#1', 38.89), ('A#1', 45.92), ('F2', 52.89), ('C3', 59.95)):
    note(f'hrn_{n.replace("#", "s")}', 'hrn', V(f'Brass/F Horn/sus/MOHorn_sus_{n}_v2_1.wav'), r, 'mus_brass', dur=4.6, sus=[1.5, 4.2], target=-16)
for n, r in (('C3', 59.99), ('G3', 67.07), ('D4', 74.06), ('A4', 81.07)):
    note(f'tpt_{n}', 'tpt', V(f'Brass/Trumpet/sus/Sum_SHTrumpet_sus_{n}_v3_rr1.wav'), r, 'mus_brass', dur=3.6, sus=[1.2, 3.3], target=-16)
for n, r in (('A#0', 33.88), ('D#1', 39.02), ('A#1', 45.89), ('D2', 49.91)):
    note(f'tba_{n.replace("#", "s")}', 'tba', V(f'Brass/Tuba/stac/Tuba3_stac_{n}_v2_rr1_Sum.wav'), r, 'mus_brass', dur=1.2, fout=0.2, target=-15)
for n, r in (('131', 45.0), ('140', 54.07), ('149', 63.01), ('158', 71.96)):
    note(f'org_{n}', 'org', V(f'Keys/Organ/Quiet/NT5_Man3Quiet_{n}_rr1.wav'), r, 'mus_org', dur=5.0, sus=[1.6, 4.6], target=-18)
D = 'mus_drums'
note('snare_a', 'snare', V('Percussion/Snare2-HitSN_v7_rr2_Sum.wav'), 0, D, dur=0.8, fout=0.3, target=-14)
note('snare_b', 'snare', V('Percussion/Snare2-HitSN_v5_rr1_Sum.wav'), 0, D, dur=0.8, fout=0.3, target=-17)
note('snare_g', 'snareg', V('Percussion/Snare2-HitNS_v3_rr1_Sum.wav'), 0, D, dur=0.6, fout=0.3, target=-22)
note('snare_roll', 'roll', V('Percussion/Snare2-rollSN_v3_rr1_Sum.wav'), 0, D, dur=2.5, fout=0.8, target=-17)
note('bd_a', 'bd', V('Percussion/BDrumNewhit_v5_rr1_Sum.wav'), 0, D, dur=2.0, fout=0.6, target=-14)
note('bd_b', 'bd', V('Percussion/BDrumNewhit_v3_rr2_Sum.wav'), 0, D, dur=1.6, fout=0.6, target=-16)
note('cym', 'cym', V('Percussion/cymbal-crash1_mf_rr1.wav'), 0, D, dur=5.0, fout=2.0, target=-19)
note('timp_a', 'timp', V('Percussion/Timpani/Timpani2_Hit_v3_rr1_Sum.wav'), 0, D, dur=4.0, fout=1.5, target=-14)
note('timp_b', 'timp', V('Percussion/Timpani/Timpani4_Hit_v3_rr1_Sum.wav'), 0, D, dur=4.0, fout=1.5, target=-15)
note('gong', 'gong', V('Percussion/gongHit_p.wav'), 0, 'mus_bell', dur=8.0, fout=3.0, target=-17)
note('bell_c', 'bell', VC('Idiophones/Struck Idiophones/Tubular Bells 2/TB_hit_C4_v2_1.wav'), 72, 'mus_bell', dur=7.0, fout=2.5, target=-16)
note('bell_a', 'bell', VC('Idiophones/Struck Idiophones/Tubular Bells 2/TB_hit_A4_v2_1.wav'), 81, 'mus_bell', dur=7.0, fout=2.5, target=-16)
for n, r in (('E4', 76.03), ('A4', 81.13), ('C5', 84.01)):
    note(f'chime_{n}', 'chime', VC(f'Idiophones/Struck Idiophones/Hand Chimes/sus_{n}_r01_main.wav'), r, 'mus_bell', dur=4.5, fout=1.5, target=-18)

ENTRIES = E
