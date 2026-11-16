/* Audit visuel (v1.16) : planches « bases + bâtiments + réparateurs » — par camp et par ère (+ transcendance) :
   A = base intacte, fort 1, 3 emplacements (muraille, tourelle, ferme/marché) ;
   B = base abîmée, fort 3 (garnison), puits/marché/tourelle niv. 3, nano-réparation active (« petits gus »), bâtiments abîmés.
   Sortie : <dossier>/bases-<camp>-e<ère>-<A|B>.png      usage : node tools/audit-visuel-bases.mjs <dossier>   (npm run dev avant) */
import { ouvrir } from './_audit-visuel-lib.mjs';
const out = process.argv[2];
const { browser, page, errs } = await ouvrir({ dsf:2 });
await page.evaluate(() => { __neutre(true); window.drawSlot = window.__drawSlot0; window.drawBase = window.__drawBase0; });
for (const fac of ['HUM', 'IA']) for (const [era, trans] of [[0,false],[1,false],[2,false],[3,false],[4,false],[4,true]]) for (const v of ['A','B']){
  await page.evaluate(([fac, era, trans, v]) => { __fresh(fac, era, trans); const S = game.p; S.x = 150; S.slots.forEach((s,i)=>{ s.x = 150 + 95 + i*64; });
    const types = v==='A'? ['wall','turret','farmF'] : ['well','farmM','turret'];
    S.slots.forEach((s,i)=>{ s.b = mkB(S, types[i]); s.owner = S; s.b.age = 9; s.b.lvl = v==='A'? 1 : 3; });
    S.fortLvl = v==='A'? 1 : 3; S.autoRepair = v==='B'; S._bs = null; S._btr = null;
    if (v==='B'){ S.hp = S.maxhp*0.4; S.slots.forEach((s,i)=>{ s.b.hp = s.b.maxhp*(i? 0.35 : 0.8); });
      S.gar = [0,1,2].map(i=>({ fac:S.facKey, era, role:i? 'ranged':'siege', range:200, rate:1, atkT:1, bob:i })); }
    camX = 40; __R(1); game.t += 3; __R(3); }, [fac, era, trans, v]);
  const k = await page.evaluate(() => [innerWidth / W, Y_G]);
  await page.screenshot({ path:`${out}/bases-${fac}-e${era}${trans?'T':''}-${v}.png`, clip:{ x:0, y:k[1]*k[0]-260, width:640, height:300 } });
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
