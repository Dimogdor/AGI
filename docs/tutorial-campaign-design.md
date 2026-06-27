# Tutorial & Solo Campaign — Design Reference (pre-removal snapshot)

> Snapshot of the scripted tutorial and the solo campaign/story systems in "Guerre des Ères" (single-file browser RTS, concatenated `src/*.js` modules + `shell.html`). Captured immediately before deletion so the rewrite can reference the original intent, data shapes, and wiring. All line numbers cite the pre-removal source as recorded in the inventory.

---

## 1. Overview — what each system does and how it's invoked

The game has three play modes: **skirmish** (vs AI), **online** (P2P multiplayer), and the two systems documented here — the **guided tutorial** and the **solo campaign/story**. Both are layered *on top of* the shared skirmish core (`newGame()`, the `game` object, action handlers, the simulation loop) and are toggled by two state flags: `game.tut` (tutorial) and `game.scenario` (campaign). When both are null/false the game behaves as plain skirmish.

### Tutorial
- **What it does:** A 24-step interactive, spotlight-driven walkthrough that teaches UI, controls, economy, recruitment, building, era evolution, stances, special powers, hero, and a scripted final battle. It runs as a real game (Humanité faction, easy difficulty) with a "soft-freeze" between steps and a permission gate (`tutGate`) that blocks any action not relevant to the current step.
- **Entry points:**
  - Menu tab/button **TUTORIEL** → `tutoStartBtn` (`shell.html:160` tab, `shell.html:268-270` page; wired in `21-menu.js:122`) calls `startTutorial()` (`15-tutorial.js:328`).
  - **First-launch auto-start:** IIFE `maybeFirstLaunchTutorial()` in `22-input.js:385-389` checks `localStorage['agi_tutoSeen']`; if unset, calls `startTutorial()`.
  - Completion persisted via `agi_tutoSeen` (`15-tutorial.js:349`).

### Solo Campaign / Story
- **What it does:** A 10-mission narrative campaign — 5 Human arc ("La Commune", `h1`–`h5`) + 5 AI arc ("Protocole Singularité", `i1`–`i5`). Each mission re-themes terrain/decor, caps era, locks unit roles, fixes/locks world decay and weather, scripts enemy waves and narrative dialogue via triggers, places destructible POIs (terminals, servers, cores, incubators, drills, jammers, fuel depots), and checks a mission-specific objective (survive/hold/build/era/destroy/destroyFull). Progress is persisted and missions unlock sequentially.
- **Entry points:**
  - Play page **CAMPAGNE SOLO** button → `campBtn` (`shell.html:175`, wired `21-menu.js:32`) calls `showStoryPage()` (`21-menu.js:21-26`) → `renderStoryList()` (`16-campaign.js:336-354`) populates `#storyList` (`shell.html:265`).
  - Selecting a mission → `openBriefing(id)` (`16-campaign.js:356-371`) fills the `#briefscreen` overlay (`shell.html:306-318`).
  - **LANCER LA MISSION** → `briefStart` (`shell.html:314`, wired `21-menu.js:34`) calls `startMission()` (`16-campaign.js:372-383`).

---

## 2. Tutorial — full logic

All tutorial code lives in **`15-tutorial.js`** (559 lines), driven by the global `TUT` object (`05-state.js:25`) and the `game.tut` boolean (`07-decor.js:128` init context, set true at `15-tutorial.js:333`). A vestigial legacy `tutoStep` counter (`05-state.js:24`, pinned to `-1`) survives only as a guard in input/net code.

### 2.1 The freeze / gate / advance model

Three intertwined mechanisms govern tutorial flow:

**Soft-freeze (`TUT.frozen`).** Set true on entering a step (`tutEnterStep()`, `15-tutorial.js:281-290`). While frozen, the simulation early-returns to a tutorial-only path: in `10-simulation.js:474`, `if (game.tut && TUT && TUT.frozen){ … tutTick(dt); return; }` — combat/economy/time updates are skipped, but `tutTick(dt)` still runs so step completion can be detected, and camera/input remain live. This is a *soft* pause (world visible, frozen) distinct from the hard `paused` flag. **Note: a known risk class is "soft-freeze bugs / dark dead-ends" — see §7.**

**Permission gate (`tutGate(a)`, `15-tutorial.js:265-280`).** Returns `true` only if the action descriptor `a` is allowed by the current step's `allow()` predicate (or if the step has no `allow`), else fires a rate-limited `tutNudge()` and returns `false`. Every action handler is wrapped in `tutGate` during tutorial — keyboard handlers and HUD click handlers in `22-input.js` (lines 31-46, 243-246, 290, 299-314) and the build auto-place exemption in `08-actions.js:220` (`if (game && game.tut) near = true;` — any indicated socket builds immediately, bypassing distance/security checks).

**Celebration / advance.** Per frame, `tutTick(dt)` (`15-tutorial.js:308-320`) calls `step.done()`. On success it triggers a celebration animation (`TUT.celebrating`/`celebT`) then auto-advances via `tutAdvance()` (`15-tutorial.js:298-307`), which records the just-completed action into `TUT.revealed`, calls `step.exit()`, and either enters the next step (`tutEnterStep`) or calls `endTutorial()`. Informative steps (`step.tap===true`) advance on a "Continue" click/Space/Enter via `tutBeginAct()` (`15-tutorial.js:292-297`; key handler `22-input.js:25-29`).

`startTutorial()` (`15-tutorial.js:328-347`) builds the `TUT` state object: `{ i, t, steps, celebrating, celebT, uiRects, confirmRects, confirmSkip, frozen, revealed, eraBase, specBase }`, creates the game (HUM/easy), hides the menu, sets `game.tut=true`, adds extra build slots, and enters step 0. `endTutorial()` (`15-tutorial.js:348-354`) writes `agi_tutoSeen`, nulls `TUT`/`game`, and restores the menu.

### 2.2 Step structure and the ~24 steps

`TUT_STEPS` (`15-tutorial.js:46-256`) is an array of 24 step objects. Per-step fields (as documented):
- **text** — localized (FR/EN) instruction string, retrieved via `tutText()` (`15-tutorial.js:8`).
- **obj** — the step's objective line (shown on the card).
- **enter()** — setup hook: grant resources (`tutGrant`), pan camera (`tutCam`), spawn units/waves, etc.
- **focus()** — returns the spotlight target rect (HUD button via `tutHudRect`, or world position via `tutWorldRect`).
- **allow(desc)** — predicate over an action descriptor (`tutDesc`) deciding what `tutGate` permits this step.
- **done()** — completion check (e.g. `tutCount(role)>=n`, `tutHasBuild(type)`).
- **tap** (boolean) — if true, informative step advanced by "Continue"; otherwise an action step auto-detected via `done()`.
- **exit()** — teardown hook on advance.

The curriculum spans (per inventory): welcome/intro → camera & selection → resources/economy → recruiting basic units → building construction → control points/zones → era evolution → unit upgrades → stances (charge/hold/retreat) → formation → special power → hero summon → a scripted enemy wave (`tutSpawnWave`, used at step ~12) → final battle. The exact teaching text for each of the 24 is in the FR/EN strings at `15-tutorial.js:46-256` (and the disabled multi-language `TUT_L10N` at `02-i18n.js:270`).

> The precise per-step ordering beyond this grouping is not enumerated field-by-field in the inventory; the canonical source is `TUT_STEPS` (`15-tutorial.js:46-256`). **Before deletion, copy that array verbatim into an appendix if exact wording must be preserved.**

### 2.3 Spotlight / card rendering & cumulative button visibility

**Rendering** is `drawTut()` (`15-tutorial.js:371-443`), called from `13-hud.js:268` (`if (game && game.tut && TUT) drawTut();`). It draws: a vignette/veil overlay, the spotlight cut-out on `step.focus()`, an instruction card (text + objective + progress dots + Skip/Continue buttons), and a pulsing arrow from card to spotlight (`tutArrow()`, `15-tutorial.js:356-363`; text wrap via `tutWrap()`, `15-tutorial.js:364-370`). Clickable rects are recorded in `TUT.uiRects`. Skip shows a confirmation modal `drawTutConfirm()` (`15-tutorial.js:444-466`) gated by `TUT.confirmSkip`, with rects in `TUT.confirmRects`; click handling is in `22-input.js:176-194`.

**Cumulative visibility (the well-liked feature).** Buttons already taught stay visible but greyed; the current step's button is highlighted; not-yet-taught buttons are hidden. Implemented across:
- `13-hud.js btnHidden()` (lines 35-46): in tutorial, a button is hidden unless the current `step.allow(tutDesc(b))` is true OR `TUT.revealed.some(p => p(desc))` is true (already taught).
- `13-hud.js btnGreyed(b)` (lines 52-59): returns true (render at `globalAlpha 0.38`, applied at line 237) when a button was already taught but is not the current step's action.
- Build-menu filtering & highlighting in `drawBuildMenu()` (`13-hud.js:504-510` filter to current+revealed; `13-hud.js:521-536` highlight current with accent color, dim past at `0.4`).

### 2.4 Helper functions (`15-tutorial.js`)

| Helper | Lines | Role |
|---|---|---|
| `tutText()` | 8 | FR/EN text lookup for step strings |
| `tutGrant(f,m,w)` | 9 | Grant food/money/water to player |
| `tutCam(wx)` | 10 | Pan camera to world X, disable auto-follow |
| `tutCount(role)` | 11-12 | Count player units of a role (active+queued) for `done()` |
| `tutHasBuild(type)` | 13-15 | Whether player has a building type (for `done()`) |
| `tutEmptySlot()` | 16-19 | Find next free construction slot |
| `tutHudRect(match)` | 20 | Screen rect of a HUD button matching predicate (spotlight) |
| `tutDesc(b)` | 22-35 | Map a HUD button to an action descriptor `{t, …}` for gate checks |
| `tutWorldRect(wx)` | 36 | Screen rect of a world position (spotlight) |
| `tutSpawnWave()` | 37-41 | Spawn scripted (non-AI) enemy wave for the combat step |

Plus the control functions: `tutNudge()` (257-263), `tutGate()` (265-280), `tutEnterStep()` (281-290), `tutBeginAct()` (292-297), `tutAdvance()` (298-307), `tutTick()` (308-320), `tutLocApply()` (321-327, disabled stub), `startTutorial()`/`endTutorial()` (328-354), `tutArrow()`/`tutWrap()` (356-370), `drawTut()`/`drawTutConfirm()` (371-466), `refreshTutoPage()` (468-476, fills `#tutoIntro`/`#tutoStartBtn`).

---

## 3. Solo Campaign / Story — full logic

All campaign code lives in **`16-campaign.js`** (416 lines), driven by `game.scenario` (`07-decor.js:119` init null, set at `16-campaign.js:378`).

### 3.1 Mission / scenario data model

**`CAMPAIGN` array (`16-campaign.js:306-332`)** — 10 missions. Each entry: `{ id, arc ('HUM'|'IA'), fac, diff, year, locked (prerequisite mission id), obj (objective spec), setup(game) }`. Helpers: `missionById(id)` (333), `missionUnlocked(m)` (334, via `campIsDone`), `missionTier(m)` (30, derives tier 1–5 from `CAMPAIGN` index + arc).

**`game.scenario`** runtime object (`16-campaign.js:378`): `{ mission, t0, holdT, result, triggers, coresLeft, … }`.

**Tier-indexed config arrays (`16-campaign.js:22-29`):** `MISSION_TERRAIN`, `MISSION_DEV` (decay baseline), `MISSION_DEVLOCK` (freeze decay), `MISSION_NOCATA` (freeze weather), `MISSION_LOCKS`/`MISSION_AILOCKS` (forbidden roles), `MISSION_AIHERO` (AI hero auto-cast), `MISSION_BARRIER` (barrier X position).

**Persistence:** `CAMP_KEY = 'agi_campaign'` (line 2); `campProgress()` (3), `campDone(id)` (4), `campIsDone(id)` (5).

### 3.2 Mission setup pipeline

`startMission()` (372-383): reset state, `newGame()`, set `game.scenario`, run `m.setup(game)`, then `applyMissionMap(game, m)` (283-303) which applies: terrain (`MISSION_TERRAIN`), `applyLayout(g,tier)` (32-46, zone/node/neutral positions), `capEra(g,n)` (6, sets `game.eraCap` and clamps both sides), role locks (`game.lockRoles`/`aiLockRoles`), decay/weather locks (`game.devLock`/`devBase`/`noCata`), `game.barrier` (clamps player units at `barrier.x-8` via `barrierBlock()`, `10-simulation.js:331-337`, until `barrier.opened`), POIs (`missionPOIs`), and triggers (`missionTriggers`).

### 3.3 Triggers, waves, narrative

- `missionTriggers(g,m,tier)` (66-112) — per-tier array of one-shot triggers, each time-based (`t`) or condition-based (`when`); fires enemy waves, POI callbacks, narrative, cataclysms.
- `processTriggers(dt)` (113-120) — per-frame, fires ready triggers; called from `10-simulation.js:648` (inside `if (game.scenario)`).
- `spawnEnemyWave(keys,opt)` (48-58) — direct push into `game.e.units`, bypassing cap; announces + screen shake.
- `dlg(g,n)` (62-65) — faction-flavored announce (HUM radio vs IA system log) via `camp_dlg{n}_{h|i}`.
- Cataclysm/endgame hook: `triggerNuclearWinter()` is invoked from triggers, and the `destroyFull` objective drives a **phase-2 enemy respawn + nuclear winter** in `10-simulation.js:647-660`.

### 3.4 POIs (destructible structures)

`POI_ICON`/`POI_COL` (126-127), `mkPOI(xf,hp,type,fire)` (128). Factories: `mkIncubator` (153-160, releases `spawnBabyBots` 140-152), `mkFuelDepot` (164-174, chain explosion), `mkDrill` (177-182, sabotages AI eco), `mkJammer` (185-190, blocks minimap via `game.jammed`). Effects: `sabotageEnemy(g,factor)` (130, durable `game.saboPenalty`), `lootDataNode(g)` (133-137, +XP/+res and `game.saboTempT` temp −15% AI prod). AI hero: `releaseLegend(g)` (193-200, tier 4+, power scales 0.4–1.0 by `coresLeft`). `missionPOIs(g,tier)` (202-238, tier 5 → null), `updatePOIs(dt)` (240-259, damage from nearby player units, fires callbacks, sets `game.jammed`), `drawPOIs()` (261-281, called `14-loop.js:39`).

### 3.5 Win/lose & objectives

- `scenarioCheck(dt)` (385-401) — per-frame; returns `'win'|'lose'|null` for objective types survive/hold/build/era/destroy/destroyFull. Called `10-simulation.js:650`.
- `objStatus()` (402-409) — localized progress string (`obj_survive`/`obj_hold`/`obj_build`/`obj_era`/`obj_destroy`); rendered as the HUD objective banner at `13-hud.js:204-212`.
- `endMission(win)` (410-417) — `campDone()`, set `game.over`/`game.win`, show end screen. End-screen campaign banner in `17-endgame.js:8-16` (mission name/year + next-mission unlock or retry).

### 3.6 Menu / mission-select UI

`showStoryPage()`/`showPlayPage()` (`21-menu.js:21-31`), `renderStoryList()` (`16-campaign.js:336-354`, status/unlock-gate/title/objective into `#storyList`), `briefMission` (355), `openBriefing(id)` (356-371, themed `#briefscreen` chrome HUM vs IA). DOM in `shell.html`: `#page-story` (263-266), `#briefscreen` + `#briefCard/Chrome/Year/Title/Body/Obj` (306-318).

---

## 4. Cross-module wiring — every file & what tutorial/campaign code it holds

| File | Tutorial code | Campaign code |
|---|---|---|
| `00-core.js` | *(none — pure canvas/math/terrain)* references `TUT`/`game.tut` only via shared declarations | *(none)* |
| `02-i18n.js` | `TUTO_FR` (8-33), `TUTO_EN` (34-59), `tab_tuto`/`tuto_chk`/`tuto_body` (per-lang), `TUT_L10N` (270) | `tab_story`, `story_*`, `camp_*` (`camp_btn`,`camp_hum`,`camp_ia`,`camp_dlg*`,`camp_ev_*`,`camp_poi_*`), `brief_*`, `obj_*`, `m_h[1-5]_*`, `m_i[1-5]_*` |
| `05-state.js` | `tutoStep` (24), `TUT` (25) | *(none)* |
| `07-decor.js` | `withTuto` param (94), `tutoStep=-1` (128) | `scenario:null` + `eraCap:4` (119), decor theming comment (123) |
| `08-actions.js` | `game.tut` build exemption (220) | `lockRoles`/`aiLockRoles` (29-30), `eraCap` (141), `scenario`+`aiHeroOK` hero gate (406), `spawnHero` power scaling (424-426) |
| `10-simulation.js` | `game.tut`/`TUT.frozen`/`tutTick` (457,470,474-480,510,527,539,550,575,588-591,638-643) | `scenario` (527,539,552,647-660), `barrier`/`barrierBlock` (331-337), `prodLockT`/`lockMul` (492-495), `devLock`/`devBase` (589-590), `processTriggers`/`updatePOIs`/`scenarioCheck`/`endMission` (648-652) |
| `11-cataclysm.js` | *(none)* | `g.noCata` gate (20) |
| `12-render.js` | `!game.tut` ambient FX (283), grass FX (350) | *(none)* |
| `13-hud.js` | `btnHidden` tut block (35-46), `btnGreyed` (52-59, call 237), `drawTut` (268), build-menu filter+highlight (504-510, 521-536) | objective banner `scenario`/`objStatus` (204-212), `eraCap` (47), `lockRoles` (48), masking comment (30-32) |
| `14-loop.js` | *(none)* | `drawPOIs()` call (39), `drawBarrier` call (42) |
| `15-tutorial.js` | **ENTIRE FILE** | *(none)* |
| `16-campaign.js` | `tutoStep=-1` (376) | **ENTIRE FILE** |
| `17-endgame.js` | *(none)* | `sc=game.scenario` (4), campaign banner block (8-16), `story_unlocked`/`story_complete`/`story_retry` |
| `18-net-core.js` | `tutoStep=-1` in startHost/startGuest (198, 213) | *(none)* |
| `20-net-online.js` | `tutoStep`/`game.tut` pause guards (94-95, 110) | *(none)* |
| `21-menu.js` | `tutoStartBtn` listener (122), `tutoStep=-1` in replay (127) | `showStoryPage`/`showPlayPage` (21-31), tab story handler (16), `campBtn`/`storyBack`/`briefStart`/`briefBack` listeners (32-35), comment (19-20) |
| `22-input.js` | `maybeFirstLaunchTutorial` (385-389), tut key advance (25-29), tut panel/skip clicks (176-194), `tutGate` wraps (31-46,243-246,290,299-314), `tutoStep` guards (53,79,97,119,210) | *(none direct)* |
| `shell.html` | `.tuto` CSS (31,120-123), `data-page=tuto` tab (160), `#page-tuto`/`#tutoIntro`/`#tutoStartBtn` (268-270) | `#campBtn` (175), `#page-story`/`#storyIntro`/`#storyList`/`#storyBack` (263-266), `#briefscreen` CSS+HTML (62-103, 306-318) |

---

## 5. Shared helpers that MUST survive removal

These are used by skirmish/online too; do **not** delete:

- **Core lifecycle/state:** `game` object, `newGame()`, `mkSide()`, `spawnUnit()`, `spawnHero()`.
- **Data tables:** `DIFFS`, `ROLES`, `FACTIONS`, `BUILDS`, `EVOLVE_XP`, `HERO_CD`, `CATAS`, `TERRAIN_DEFAULT`/`TERRAINS`, `DECOR`, `ROLE_CODES`/`CODE_ROLES`.
- **Caps/economy:** `unitTotal()`, `droneCount()`, `droneCap()`, `sideBuildSlots()`, `canPay()`/`pay()`/`unitCost()`, `calcRates()`, `statMul()`, `homeBuff()`, `lvlF()`, `longevMul()`.
- **Action handlers:** `tryBuy/tryBuild/tryUpgRole/tryEvolve/trySpecial/tryHero/tryCapUp/tryRepair*/tryFortify/tryAutoRepair/tryGarrison/dispatchGarrison/setStance/startCata/updateCata`. (Strip `tutGate` wrappers/guards, keep the calls.)
- **Camera/coords:** `VW()`, `zTY()`, `s2wX/s2wY/w2sX/w2sY`, `camClamp()`, `gY()`, `zoom/camX/camFollow`.
- **Effects/UI:** `announce()`, `sfx()`/`sfxAt()`, `addFloater()`, `burst()`, `addLight()`, `LIGHTS/particles/floaters/shots/deaths`, `ctx/W/H/SCALE`.
- **HUD core:** `HUD`/`HUD.btns`, `layoutHUD`, `drawHUD`, `drawBtn`, `drawBuildMenu`, `buildMenu`, `buildOptions`, `heroBtnReady`. **`btnHidden()` survives** (drives era/role visibility generally) — only strip its tutorial branch.
- **i18n:** `t()`/`tr`/`_t`/`fmt()`, `applyLang()`, `I18N`, `SETTINGS.lang`. **`warJournal()`** in `17-endgame.js` is generic — keep.
- **Cataclysm system:** `updateCata/triggerCata/startCata/drawCata/drawWinter/nukeBlast/razeMap/triggerNuclearWinter/CATAS` — all core.
- **Net/menu plumbing:** `$()`, `intro/introT/pendingStart`, `isOnline()`, `net/netDisconnect()`, online pause functions, `togglePauseAction/toggleSoftPause`.
- **Shared state fields** still consumed by skirmish: `game.eraCap` is **debated** — see §6 (one removal note keeps `eraCap:4` as a generic max-era cap; another removes it). Resolve before deleting.

> **`POI_ICON`/`POI_COL`** are referenced by tutorial event messages too (per shared-helper note); confirm no skirmish/tutorial use before deleting.

---

## 6. Clean-removal plan (ordered to keep the build green)

**Order:** (1) strip call sites/guards in shared files so nothing references the doomed symbols; (2) delete the two whole files; (3) drop menu/HTML/i18n; (4) remove state fields. Build after each phase.

### Phase 1 — strip guards & call sites (keep build green)

**`05-state.js`** — delete `tutoStep` (24) and `TUT` (25).

**`07-decor.js`** — remove `withTuto` param (94) and update call sites; delete `tutoStep=-1` (128); from the `newGame` `game` initializer remove `scenario:null`. **Decision point:** the campaign-file note deletes `eraCap` entirely; the decor-file note *keeps* `eraCap:4` as a generic max-era. Pick one and apply consistently across `08-actions.js:141` and `13-hud.js:47`.

**`08-actions.js`** — delete role-lock checks (29-30), the build auto-place exemption (220, `if (game && game.tut) near = true;`), and the AI hero gate (406). At `141` remove the `eraCap` ternary (becomes a plain `era>=4` cap). Drop campaign comments (27-28, 403-405, 424-426).

**`10-simulation.js`** — delete tutorial HP-floor + `tutTick` block (638-643); the `TUT.frozen` soft-freeze block (474-480); change `tutoStep>=0` guard (470) to drop it; un-gate zone-capture announce (457), dev-flash (510), `aiUpdate` (575), `updateCata` (591); simplify `game.dev` (588-590, drop `game.tut?0:` and `devLock`); delete the whole `if (game.scenario){…}` block (647-660); drop `&& !game.scenario` from weather/boon (527,539) and bonus-zone (552); delete `prodLockT`/`lockMul` (492-495); delete `barrierBlock()` and its 3 call sites (329,331-337,340,347) and `drawBarrier` (335).

**`11-cataclysm.js`** — at line 20 drop `|| g.noCata`.

**`12-render.js`** — strip `!game.tut` from ambient FX (283) and grass FX (350).

**`13-hud.js`** — delete `btnHidden` tutorial branch (35-46, keep era/role logic per §6 decision); delete `btnGreyed` (52-59) and its use (237-241), call `drawBtn(b)` directly; delete `drawTut()` call (268); delete objective banner (204-212); delete build-menu tutorial filter (504-510) and restore the plain build-menu loop (521-536). Keep/trim `lockRoles` (48) per §6.

**`14-loop.js`** — delete `drawPOIs()` (39) and `drawBarrier` call (42).

**`17-endgame.js`** — delete `const sc=game.scenario` (4) and the campaign banner block (8-16); set `s.innerHTML` to start from the generic stats (drop `campHdr +`). Keep `warJournal()`/`showEnd()`.

**`18-net-core.js`** — delete `tutoStep=-1` at 198 and 213 (keep `intro`/`pendingStart`).

**`20-net-online.js`** — delete pause guards `tutoStep>=0` / `game.tut` (94-95); at 110 reduce to `if (!game || game.over) return;`.

**`21-menu.js`** — delete `tutoStartBtn` listener (122); remove `tutoStep=-1` from replay reset (127); delete `showStoryPage`/`showPlayPage` (21-31), the story tab handler (16), and `campBtn`/`storyBack`/`briefStart`/`briefBack` listeners (32-35); drop comment (19-20).

**`22-input.js`** — delete `maybeFirstLaunchTutorial()` IIFE (385-389), tut key-advance (25-29), tut panel/skip click block (176-194); un-wrap all `tutGate(...)` calls (31-46, 243-246, 290, 299-314) keeping the bare action calls; the `tutoStep` guards (53,79,97,119,210) become dead (always -1) — remove. **Keep `btnHidden()` calls (81, 298).**

### Phase 2 — delete whole files
- `src/15-tutorial.js` (entire).
- `src/16-campaign.js` (entire). (Both `processTriggers/updatePOIs/scenarioCheck/objStatus/endMission/drawPOIs` are only called from now-deleted blocks.)

### Phase 3 — menu / HTML / i18n
- **`shell.html`:** delete `.tuto` CSS (31,120-123), `#briefscreen` CSS (62-103), tutorial tab (160), `campBtn` (175), `#page-story` (263-266), `#page-tuto` (268-270), `#briefscreen` HTML (306-318). Keep only PLAY/OPTIONS tabs.
- **`02-i18n.js`:** delete `TUTO_FR`/`TUTO_EN` (8-59), `TUT_L10N` (270); from **every** language remove: `tab_tuto`,`tuto_chk`,`tuto_body`; `tab_story`,`story_intro`,`story_done`,`story_unlocked`,`story_complete`,`story_retry`; `camp_btn`,`camp_hum`,`camp_ia`,`brief_start`,`brief_back`,`brief_chrome_hum`,`brief_chrome_ia`; `obj_survive`,`obj_hold`,`obj_build`,`obj_era`,`obj_destroy`; all `m_h[1-5]_*` / `m_i[1-5]_*`; all `camp_dlg*`,`camp_ev_*`,`camp_poi_*`; `mm_jammed`. Keep `t()`/`tr`/`_t`/`applyLang()`/`I18N`/`SETTINGS.lang`.

### Phase 4 — state fields to drop from `newGame()`/`game`
`scenario`, `lockRoles`, `aiLockRoles`, `noCata`, `devLock`, `devBase`(if mission-only), `pois`, `barrier`, `jammed`, `saboPenalty`, `saboTempT`, `_legendOut`, `aiHeroOK`, `prodLockT`, `bonusZone` mission-disable. **`eraCap`:** keep-or-drop per §6 decision. **localStorage:** drop `agi_tutoSeen` and `agi_campaign` usage.

### Guards to strip (global)
All `if (game.tut)`, `if (!game.tut)`, `&& !game.tut`, `|| game.tut`, `if (game.scenario)`, `if (!game.scenario)`, every `tutGate(...)` wrapper (keep the action), and all `game.lockRoles/aiLockRoles/eraCap(see §6)/noCata/devLock/saboPenalty/saboTempT/aiHeroOK/pois/barrier/jammed` conditionals. **Result:** skirmish-only + online; no tutorial/campaign UI, no triggers/POIs/barriers/era-caps/role-locks; dynamic decay + random cataclysms always on; minimap always visible; AI free to summon hero; generic end screen + war journal.

---

## 7. Rewrite goals (carry-over intent — TODOs to refine)

- [ ] **A clean, simple, WORKING tutorial.** Single source of truth for steps (a `TUT_STEPS`-style array with `text/obj/focus/allow/done/tap/enter/exit`), but minimize per-step custom `enter()/exit()` hooks to reduce fragility.
- [ ] **Preserve the well-liked "cumulative visibility" idea.** Controls already taught stay visible but greyed; the current control is highlighted (accent color); not-yet-taught controls hidden. Reuse the old model: `revealed[]` set + `btnGreyed`/`btnHidden` branches + build-menu filter/highlight (`13-hud.js:35-59, 504-536`). Make it a first-class, reusable HUD state rather than scattered tutorial guards.
- [ ] **No soft-freeze bugs / no dark dead-ends.** The old `TUT.frozen` soft-pause + early-return in the sim (`10-simulation.js:474`) and the gated action handlers created risk of stuck states (action allowed by `allow()` but `done()` never satisfiable, or the spotlight pointing at a hidden/greyed button). Rewrite with: (a) every step guaranteed-completable (or always-Skippable), (b) a watchdog/timeout that surfaces a hint or auto-advances, (c) avoid full-screen veils that can trap input — prefer a non-blocking highlight, (d) never freeze without a visible, clickable way forward.
- [ ] **Gate model simplification.** Consider replacing the per-action `tutGate` wrappers (16+ call sites in `22-input.js`) with a single centralized input filter keyed off the current step's `allow()`, so action handlers stay clean.
- [ ] **Decide `eraCap` fate** (generic max-era vs mission-only) and remove the ambiguity noted in §5/§6 before reintroducing any era-capping in the new campaign.
- [ ] **First-launch behavior:** decide whether to auto-start the new tutorial (old `agi_tutoSeen` + `maybeFirstLaunchTutorial`) or make it opt-in only.
- [ ] **Placeholder for the new campaign vision (user to fill in):**
  - [ ] Mission data model & objective types (the old set: survive / hold / build / era / destroy / destroyFull).
  - [ ] Whether to keep narrative arcs (HUM "La Commune" / IA "Protocole Singularité") or start fresh.
  - [ ] Trigger system (time/condition one-shots) — keep or redesign.
  - [ ] POIs / sabotage / jammer / barrier / scripted waves / legend boss — which mechanics to carry over.
  - [ ] Mission re-theming (terrain/decor/decay/weather locks, role locks, era caps) — which to retain.
  - [ ] Progression & persistence (sequential unlock, `agi_campaign`-style save).
  - [ ] Briefing/mission-select UI direction (old `#page-story` + `#briefscreen` themed chrome).

---

Reference files for the rewrite: the now-deleted **`src/15-tutorial.js`** (tutorial) and **`src/16-campaign.js`** (campaign) — recover their full text from git history before they are removed if exact step wording or mission scripting must be reproduced.

---

## Appendix A — `TUT_STEPS` verbatim (the 24 steps, exact FR/EN text)

> Copied verbatim from `src/15-tutorial.js` immediately before removal. This is the canonical, exact wording and per-step logic. Recover the surrounding helpers from git history (`git show <pre-removal-sha>:src/15-tutorial.js`).

```js
const TUT_STEPS = [
  { // 0 — accueil & objectif
    tap:true,
    text:{fr:"Bienvenue, commandant. Objectif : détruire la base ennemie à droite. En haut, vos ressources — 🌾 nourriture, 🪙 argent, 💧 eau — et leur revenu par seconde.",
          en:"Welcome, commander. Goal: destroy the enemy base on the right. Top bar: your resources — 🌾 food, 🪙 money, 💧 water — and income per second."},
    focus:()=>({x:0,y:0,w:Math.min(320,W),h:38}),
  },
  { // 1 — ferme (🌾)
    text:{fr:"Tout commence par l'ÉCONOMIE. Touchez le socle « + » surligné devant votre base et construisez une 🌾 FERME. Chaque ferme produit +4 🌾/s — la nourriture sert à recruter et entretenir vos troupes.",
          en:"Everything starts with the ECONOMY. Tap the highlighted \"+\" pad in front of your base and build a 🌾 FARM. Each farm yields +4 🌾/s — food is used to recruit and sustain your troops."},
    obj:{fr:"Construisez une ferme",en:"Build a farm"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmF',
    done:()=>tutHasBuild('farmF'),
  },
  { // 2 — marché (🪙)
    text:{fr:"Construisez maintenant un 🪙 MARCHÉ sur le socle surligné. Il produit +4 🪙/s : l'argent paie le recrutement de vos troupes et la construction de vos bâtiments.",
          en:"Now build a 🪙 MARKET on the highlighted pad. It yields +4 🪙/s: money pays for recruiting troops and constructing buildings."},
    obj:{fr:"Construisez un marché",en:"Build a market"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmM',
    done:()=>tutHasBuild('farmM'),
  },
  { // 3 — puits (⛲) + bonus de longévité
    text:{fr:"Enfin un ⛲ PUITS sur le dernier socle (+3 💧/s). Astuce : un bâtiment gardé en vie monte en régime — jusqu'à ×3. Protégez et réparez vos fermes !",
          en:"Finally a ⛲ WELL on the last pad (+3 💧/s). Tip: a building kept alive ramps up — up to ×3 output. Protect and repair your farms!"},
    obj:{fr:"Construisez un puits",en:"Build a well"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='well',
    done:()=>tutHasBuild('well'),
  },
  { // 4 — mêlée ×2
    text:{fr:"Une économie sans armée ne tient pas. En bas : la barre de recrutement. Recrutez DEUX unités de ⚔ MÊLÉE (bouton surligné) : rapides et résistantes au corps-à-corps, elles forment votre première ligne.",
          en:"An economy without an army won't last. At the bottom: the recruit bar. Recruit TWO ⚔ MELEE units (highlighted button): fast and tough up close, they form your front line."},
    obj:{fr:"Recrutez 2 unités de mêlée",en:"Recruit 2 melee units"},
    enter:()=>{ tutGrant(600,400,120); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='buy'&&a.i===0,
    done:()=>tutCount('melee')>=2,
  },
  { // 5 — tireurs ×2
    text:{fr:"Recrutez maintenant DEUX 🏹 TIREURS : fragiles, mais ils frappent de loin. Une bonne armée MÊLE toujours corps-à-corps (devant) et distance (derrière).",
          en:"Now recruit TWO 🏹 RANGED units: fragile, but they strike from afar. A good army always MIXES melee (front) and ranged (back)."},
    obj:{fr:"Recrutez 2 tireurs",en:"Recruit 2 ranged units"},
    enter:()=>{ tutGrant(400,600,120); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===2),
    allow:a=>a.t==='buy'&&a.i===2,
    done:()=>tutCount('ranged')>=2,
  },
  { // 6 — aérien ×1
    text:{fr:"Ajoutez une unité 🦅 AÉRIENNE : elle survole le sol et ignore la mêlée — parfaite pour contourner les murs et harceler l'arrière ennemi.",
          en:"Add one 🦅 AIR unit: it flies over the ground and ignores melee — perfect to bypass walls and harass the enemy backline."},
    obj:{fr:"Recrutez 1 unité aérienne",en:"Recruit 1 air unit"},
    enter:()=>{ tutGrant(400,600,200); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===4),
    allow:a=>a.t==='buy'&&a.i===4,
    done:()=>tutCount('air')>=1,
  },
  { // 7 — sélection d'une unité (contrôle individuel)
    text:{fr:"Place au CONTRÔLE. Touchez l'une de vos unités sur le terrain pour la SÉLECTIONNER — un cadre apparaît autour d'elle. Une unité sélectionnée obéit à vos ordres individuels.",
          en:"Time for CONTROL. Tap one of your units on the field to SELECT it — a frame appears around it. A selected unit obeys your individual orders."},
    obj:{fr:"Sélectionnez une unité",en:"Select a unit"},
    enter:()=>{ camFollow=false; camX=0; game.p.stance='hold'; game.sel.clear(); },
    focus:()=>{ const u=game.p.units.find(x=>!x.fly)||game.p.units[0]; return u? tutWorldRect(u.x):null; },
    done:()=>game.sel.size>=1,
  },
  { // 8 — lasso (sélection de groupe)
    text:{fr:"Pour sélectionner TOUT un groupe d'un seul geste, utilisez le ⬚ LASSO : touchez le bouton surligné, puis tracez un rectangle autour de plusieurs de vos troupes.",
          en:"To select a WHOLE group at once, use the ⬚ LASSO: tap the highlighted button, then drag a rectangle around several of your troops."},
    obj:{fr:"Sélectionnez un groupe au lasso",en:"Lasso-select a group"},
    enter:()=>{ camFollow=false; camX=0; game.sel.clear(); selMode=false; },
    focus:()=>tutHudRect(b=>b.type==='lasso'),
    allow:a=>a.t==='lasso',
    done:()=>game.sel.size>=2,
  },
  { // 9 — formation
    text:{fr:"Avec un groupe, activez la ⚏ FORMATION : vos troupes se rangent automatiquement — mêlée devant, tireurs au centre, artillerie au fond. Bien plus solide qu'une cohue désordonnée.",
          en:"With a group, toggle ⚏ FORMATION: your troops auto-arrange — melee front, ranged center, artillery back. Far sturdier than a disorganized mob."},
    obj:{fr:"Activez la formation",en:"Enable formation"},
    enter:()=>{ camFollow=false; camX=0; game.p.formation=false; },
    focus:()=>tutHudRect(b=>b.type==='formation'),
    allow:a=>a.t==='formation',
    done:()=>game.p.formation===true,
  },
  { // 10 — ordre de groupe (charger)
    text:{fr:"Vos unités sélectionnées agissent ENSEMBLE. Donnez-leur l'ordre ⚔ CHARGER (bouton surligné) pour les lancer vers l'ennemi. ✋ Tenir et ↩ Replier complètent vos ordres.",
          en:"Your selected units act TOGETHER. Give them the ⚔ CHARGE order (highlighted button) to send them at the enemy. ✋ Hold and ↩ Retreat round out your orders."},
    obj:{fr:"Ordonnez la charge au groupe",en:"Order the group to charge"},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance',
    done:()=>game.p.stance==='charge'||game.p.units.some(u=>u.ord==='charge'),
  },
  { // 11 — capturer un lac
    text:{fr:"L'eau, c'est la vie. Menez vos troupes près d'un 💧 LAC et restez à proximité pour le CAPTURER : il vous fournira de l'eau en continu — et un peu d'expérience ✦.",
          en:"Water is life. Lead your troops near a 💧 LAKE and stay close to CAPTURE it: it supplies water continuously — and a bit of experience ✦."},
    obj:{fr:"Capturez un lac",en:"Capture a lake"},
    enter:()=>{ const n=game.nodes[0]; n.prog=0.85; game.p.stance='charge';
      for (const u of game.p.units) if(!u.fly){ u.x=Math.max(u.x, n.x-60); u.tx=u.x; }
      tutCam(n.x); TUT.frozen=false; },  // la capture nécessite que le monde tourne
    focus:()=>tutWorldRect(game.nodes[0].x),
    done:()=>game.nodes.some(n=>n.owner==='p'),
  },
  { // 12 — vague ennemie (texte)
    tap:true,
    text:{fr:"⚠ Une vague ennemie surgit ! Apprenons à nous défendre.",
          en:"⚠ An enemy wave appears! Let's learn to defend."},
    enter:()=>{ tutSpawnWave(); game.shake=6; sfx('boom');   // brève secousse (retombe même gelé)
      announce(tutText({fr:'⚠ VAGUE ENNEMIE',en:'⚠ ENEMY WAVE'}), '#ff5a4a');
      // pan vers l'ennemi pour qu'il soit visible, puis la carte + le bouton Continuer restent accessibles
      const e=game.e.units[0]; if(e) tutCam(e.x-200); },
    focus:()=>null,  // pas de spotlight : évite le voile quasi-total qui masquait le bouton Continuer
  },
  { // 13 — muraille
    text:{fr:"Bloquez leur avance : construisez une 🧱 MURAILLE sur le socle surligné. Solide, elle encaisse les coups à la place de vos troupes.",
          en:"Block their advance: build a 🧱 WALL on the highlighted pad. Sturdy, it takes hits instead of your troops."},
    obj:{fr:"Construisez une muraille",en:"Build a wall"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='wall',
    done:()=>tutHasBuild('wall'),
  },
  { // 14 — tourelle
    text:{fr:"Ajoutez une 🗼 TOURELLE sur le socle surligné : elle tire automatiquement sur tout ennemi à portée.",
          en:"Add a 🗼 TURRET on the highlighted pad: it automatically fires at any enemy in range."},
    obj:{fr:"Construisez une tourelle",en:"Build a turret"},
    enter:()=>{ tutGrant(300,400,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='turret',
    done:()=>tutHasBuild('turret'),
  },
  { // 15 — garnison (explication)
    tap:true,
    text:{fr:"À SAVOIR : murailles et tourelles peuvent ABRITER un tireur. Touchez-en une, puis « Garnison » — perché et protégé, il tire de plus loin et survit bien mieux.",
          en:"GOOD TO KNOW: walls and turrets can GARRISON a shooter. Tap one, then \"Garrison\" — elevated and protected, it shoots farther and survives far better."},
    focus:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')) return tutWorldRect(s.x); return null; },
  },
  { // 16 — amélioration de classe (upgrades)
    text:{fr:"Renforcez durablement vos troupes : touchez le petit ⬆ dans le coin du bouton ⚔ MÊLÉE pour AMÉLIORER toute la classe (+50 % d'effet). Les améliorations se cumulent jusqu'au niveau 3.",
          en:"Permanently strengthen your troops: tap the small ⬆ in the corner of the ⚔ MELEE button to UPGRADE the whole class (+50% effect). Upgrades stack up to level 3."},
    obj:{fr:"Améliorez la classe mêlée (⬆)",en:"Upgrade the melee class (⬆)"},
    enter:()=>{ tutGrant(600,1200,200); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='upg'||(a.t==='buy'&&a.i===0),
    done:()=>(game.p.upg.melee||0)>=1,
  },
  { // 17 — gestion des ressources : capacité d'armée
    text:{fr:"GÉRER ses ressources, c'est aussi savoir INVESTIR. Touchez 📈 CAPACITÉ pour dépenser de l'argent et de l'eau et faire passer votre armée de 30 à 40 unités. Dépenser au bon moment décide d'une partie.",
          en:"MANAGING resources also means INVESTING. Tap 📈 CAPACITY to spend money and water and raise your army cap from 30 to 40 units. Spending at the right time decides a match."},
    obj:{fr:"Augmentez votre capacité d'armée",en:"Raise your army capacity"},
    enter:()=>{ tutGrant(400,800,400); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='cap'),
    allow:a=>a.t==='cap',
    done:()=>game.p.capUp===true,
  },
  { // 18 — expérience & pouvoir ultime
    text:{fr:"L'EXPÉRIENCE ✦ se gagne au combat, en tenant lacs et zones, et en fortifiant votre base. Elle alimente votre POUVOIR ULTIME : il est prêt — lancez-le avec ✸.",
          en:"EXPERIENCE ✦ comes from combat, holding lakes and zones, and fortifying your base. It powers your ULTIMATE: it's ready — unleash it with ✸."},
    obj:{fr:"Lancez votre pouvoir ultime",en:"Unleash your ultimate"},
    enter:()=>{ const p=game.p; p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+20); TUT.specBase=game.specialsUsed; camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='special'),
    allow:a=>a.t==='special',
    done:()=>game.specialsUsed>(TUT.specBase||0),
  },
  { // 19 — évolution d'ère
    text:{fr:"L'expérience ✦ permet aussi d'ÉVOLUER : changer d'ère rend TOUTES vos forces plus puissantes et débloque de nouvelles unités. Vous avez assez d'✦ : touchez ⚡ ÉVOLUER.",
          en:"Experience ✦ also lets you EVOLVE: advancing an era makes ALL your forces stronger and unlocks new units. You have enough ✦: tap ⚡ EVOLVE."},
    obj:{fr:"Évoluez vers l'ère suivante",en:"Evolve to the next era"},
    enter:()=>{ const p=game.p; TUT.eraBase=p.era; p.xp=Math.max(p.xp, EVOLVE_XP[Math.min(p.era+1,4)]+20); },
    focus:()=>tutHudRect(b=>b.type==='evolve'),
    allow:a=>a.t==='evolve',
    done:()=>game.p.era>(TUT.eraBase||0),
  },
  { // 20 — cataclysme (démonstration)
    tap:true,
    text:{fr:"Le MONDE est un adversaire : des CATACLYSMES frappent les deux camps (tempêtes, crues, frappes nucléaires). En voici un — adaptez toujours votre stratégie.",
          en:"The WORLD is an opponent: CATACLYSMS strike both sides (storms, floods, nukes). Here's one — always adapt your strategy."},
    enter:()=>{ if (typeof startCata==='function') startCata('sand'); camFollow=false; camX=0; },
    focus:()=>null,
  },
  { // 21 — héros légendaire
    text:{fr:"Une fois par partie, invoquez votre HÉROS légendaire — 🦸 Che Guevara — qui décuple la force de toute votre armée tant qu'il vit. Touchez le bouton héros surligné.",
          en:"Once per game, summon your legendary HERO — 🦸 Che Guevara — who massively boosts your whole army while alive. Tap the highlighted hero button."},
    obj:{fr:"Invoquez votre héros",en:"Summon your hero"},
    enter:()=>{ const p=game.p; p.heroCd=0; tutGrant(900,900,300); camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='hero'),
    allow:a=>a.t==='hero',
    done:()=>game.p.units.some(u=>u.role==='hero'),
  },
  { // 22 — assaut final
    text:{fr:"Tout est en place. À l'assaut ! Ordonnez la ⚔ CHARGE et menez vos troupes détruire la base ennemie. Recrutez des renforts si besoin.",
          en:"Everything is set. Attack! Order the ⚔ CHARGE and lead your troops to destroy the enemy base. Recruit reinforcements if needed."},
    obj:{fr:"Détruisez la base ennemie",en:"Destroy the enemy base"},
    enter:()=>{ const e=game.e; e.hp=e.maxhp=600; e.stance='hold'; game.p.stance='charge'; tutGrant(800,800,300);
      for (const u of game.p.units) if(!u.fly){ u.x=Math.max(u.x, e.x-1500); u.tx=u.x; }
      camFollow=true; TUT.frozen=false; },  // le combat nécessite que le monde tourne
    focus:()=>tutWorldRect(game.e.x),
    allow:a=>a.t==='stance'||a.t==='buy',
    done:()=>game.e.hp<=0,
  },
  { // 23 — fin
    tap:true,
    text:{fr:"🎉 Tutoriel terminé ! Économie, troupes, ordres, défense, pouvoirs, évolution — tout est entre vos mains. Bonne guerre, commandant !",
          en:"🎉 Tutorial complete! Economy, troops, orders, defense, powers, evolution — it's all yours now. Good war, commander!"},
    enter:()=>{ game.flash=0.6; sfx('evolve'); },
    focus:()=>null,
```

## Appendix B — Campaign data verbatim

> Copied verbatim from `src/16-campaign.js` before removal: the per-tier config tables and the 10-mission `CAMPAIGN` array (objectives, era caps, unlock chain, setup hooks).

### B.1 — Per-tier mission config tables

```js
const MISSION_TERRAIN  = [null,'plains','hills','rugged','rugged','waste'];
const MISSION_DEV      = [0, 0.04, 0, 0.5, 0.18, 0.6];      // santé de départ (palette d'ambiance)
const MISSION_DEVLOCK  = [null, 0.04, null, 0.5, null, 0.72]; // monde FIGÉ (ambiance verrouillée) ou null = dynamique
const MISSION_NOCATA   = [null, true, true, true, false, false]; // météo verrouillée (pas de cataclysme) ?
const MISSION_LOCKS    = [null, ['siege','air'], ['air'], null, null, null];     // unités interdites au JOUEUR
const MISSION_AILOCKS  = [null, ['siege','air'], ['air'], null, null, null];     // unités interdites à l'IA (fini le hors-scénario)
const MISSION_AIHERO   = [null, false, false, false, false, true];              // l'IA invoque librement sa légende ? (T4 : NON — libération SCRIPTÉE selon les cœurs de stase ; T5 finale : oui)
const MISSION_BARRIER  = [null, 0.68, null, 0.70, null, null];                   // T1 portes blindées (ouvertes par les 3 terminaux) · T3 cloison (prise du centre)
function missionTier(m){ const i=CAMPAIGN.indexOf(m); return m.arc==='HUM'? i+1 : i-4; }
```

### B.2 — `CAMPAIGN` missions

```js
const CAMPAIGN = [
  // ---- « La Commune » (Humains) ----
  { id:'h1', arc:'HUM', fac:'HUM', diff:0, year:'2025', obj:{type:'survive', sec:240},
    setup(g){ g.p.f=140; g.p.m=80; g.p.w=20; capEra(g,0); } },
  { id:'h2', arc:'HUM', fac:'HUM', diff:1, year:'2028', obj:{type:'build', units:30, era:1},
    setup(g){ capEra(g,1); } },
  { id:'h3', arc:'HUM', fac:'HUM', diff:1, year:'2032', obj:{type:'hold', sec:180},
    setup(g){ g.p.era=g.e.era=1; capEra(g,2); } },
  // 2035 — la Singularité est en STASE au centre, protégée par 3 cœurs. Elle n'est plus invoquée
  // dès la 1re seconde (mission jadis ingagnable) : le joueur a ~6 min pour bâtir, saboter les
  // cœurs et désamorcer la légende avant sa libération (cf. missionTriggers / releaseLegend).
  { id:'h4', arc:'HUM', fac:'HUM', diff:2, year:'2035', obj:{type:'destroy'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,3); g.p.f+=120; g.p.m+=90; g.p.w+=30; } },
  { id:'h5', arc:'HUM', fac:'HUM', diff:2, year:'2038', obj:{type:'destroyFull'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,4); g.p.xp=120; } },
  // ---- « Protocole Singularité » (IA, débloqué après h5) ----
  { id:'i1', arc:'IA', fac:'IA', diff:1, year:'2025', locked:'h5', obj:{type:'survive', sec:180},
    setup(g){ capEra(g,0); } },
  { id:'i2', arc:'IA', fac:'IA', diff:1, year:'2028', locked:'i1', obj:{type:'build', units:30, era:1},
    setup(g){ capEra(g,1); } },
  { id:'i3', arc:'IA', fac:'IA', diff:2, year:'2032', locked:'i2', obj:{type:'hold', sec:180},
    setup(g){ g.p.era=g.e.era=1; capEra(g,2); } },
  { id:'i4', arc:'IA', fac:'IA', diff:2, year:'2035', locked:'i3', obj:{type:'destroy'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,3); } },
  { id:'i5', arc:'IA', fac:'IA', diff:3, year:'2038', locked:'i4', obj:{type:'destroyFull'},
    setup(g){ g.p.era=g.e.era=3; capEra(g,4); g.p.xp=120; } },
];
function missionById(id){ return CAMPAIGN.find(m=>m.id===id); }
function missionUnlocked(m){ return !m.locked || campIsDone(m.locked); }
```

