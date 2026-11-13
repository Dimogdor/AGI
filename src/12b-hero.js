/* ================= HÉROS (v1.15) : le Che et la Singularité =================
   Refonte complète des deux légendes. Avant : UN sprite figé par camp (échelle ×1,3 d'un
   fantassin), posé dans un halo radial, un anneau au sol et des faisceaux vers les alliés.
   Désormais :
   · UN PERSONNAGE PAR ÈRE (0..4), toujours reconnaissable — le Che garde béret étoilé, barbe,
     cigare et drapeau rouge, du guérillero au porte-étendard en exo-armure dorée ; la
     Singularité garde son œil magenta, son cœur losange et sa couronne à trois pointes, du
     châssis de récupération au cristal en lévitation. L'apparence suit l'ère du camp EN DIRECT.
   · UN SQUELETTE EN COUCHES cuites (dos, bras arrière, jambes ×3 poses, tronc + tête, bras
     avant + arme) animé en direct : respiration, marche, deux attaques alternées (armement,
     frappe, recul), encaissement, entrée en scène, mort — et un geste de ralliement.
   · L'AURA n'est plus une soupe de halos : étoffe (drapeau, cape) et éclats en orbite animés
     en direct en aplats, sceau à l'encre sous le héros, petit repère sous chaque allié galvanisé.
   Coût par image : ~7 drawImage + un polygone d'étoffe ; aucun dégradé ni shadowBlur en direct. */
const HSP  = { W:140, H:166, cx:52, foot:156 };           // toile d'une couche de héros (pieds en cx/foot)
const HLEG = { W:88,  H:68,  ox:-42, oy:-60 };            // toile des jambes, relative aux pieds
const HERO_S = { HUM:[1.40,1.45,1.50,1.55,1.60], IA:[1.40,1.46,1.52,1.58,1.62] };   // échelle par ère (un fantassin = 1)
const HERO_COL = { HUM:'#ffcf5a', IA:'#ff6ad6' };
const HERO_INK = 'rgba(12,8,16,0.8)';
// repères du squelette, en unités « fantassin » (pieds en 0,0 ; +x = vers l'ennemi ; y négatif = haut)
const HERO_RIG = {
  HUM: { top:[66,66,66,67,67], mz:[[33,-37.7],[34,-37.7],[31,-37.6],[31,-37.2],[33,-37.2]],
         pole:-11, ptop:[-84,-86,-88,-89,-92], fh:[12,15,16,17,19], fl:[17,22,24,26,30] },
  IA:  { top:[73,68,69,74,78], palm:[-5,-27], orb:[1,2,2,3,4] },
};
const heroEra = e => clamp(e|0, 0, 4);
function heroTop(u){ const e = heroEra(u.era); return HERO_RIG[u.fac].top[e]*HERO_S[u.fac][e] + 6; }   // hauteur de la barre de vie

/* ---------- cuisson des couches ---------- */
function heroDraw(fac, era, part, pose){ if (fac==='HUM') drawChe(era, part, pose); else drawAgi(era, part, pose); }
function heroPart(fac, era, part, pose){
  const S = HERO_S[fac][era];
  if (part==='legs') return sprite('HL'+fac+era+'p'+(pose||0), HLEG.W, HLEG.H, ()=>{ TC.translate(-HLEG.ox, -HLEG.oy); TC.scale(S,S); heroDraw(fac, era, 'legs', pose||0); });
  return sprite('HP'+fac+era+part, HSP.W, HSP.H, ()=>{ TC.translate(HSP.cx, HSP.foot); TC.scale(S,S); heroDraw(fac, era, part, 0); });
}
// portrait en pied figé (menu, intro, écran de fin) : toutes les couches, étoffe comprise
function heroFullSprite(fac, era){
  era = heroEra(era); const S = HERO_S[fac][era];
  return sprite('HF'+fac+era, HSP.W, HSP.H, ()=>{ TC.translate(HSP.cx, HSP.foot); TC.scale(S,S); heroDraw(fac, era, 'full', 0); });
}
function warmHero(side, now){
  const fac = side.facKey, era = heroEra(side.era);
  const fn = ()=>{ for (const p of ['back','armb','body','arm']) heroPart(fac, era, p); for (const q of [0,1,-1]) heroPart(fac, era, 'legs', q); };
  if (now) fn(); else WARMQ.unshift({ era, trans:false, fn });
}

/* ---------- LE CHE : guérillero → comandante → combattant moderne → exo → légende dorée ---------- */
function drawChe(era, part, pose){
  const on = p => part==='full' || part===p;
  const uni = ['#5b6b40','#52633a','#4c5c40','#475744','#424f42'][era];
  const pants = mix(uni,'#26262c', era>=2? 0.5 : 0.36), boot = era>=3? '#2c2e38' : '#2a2018';
  const skin = '#dcae84', RED = '#cf2a26', gold = '#e9c45c', hair = '#241a14', steel = '#a2aab6', dark = '#2c3037';
  const exo = era===4? '#d7b04a' : '#8791a0', glow = era===4? '#ffe9a0' : '#ffb35a';
  const R = HERO_RIG.HUM;
  const rot = (hx,hy,a,fn) => { if (!a) return fn(); TC.save(); TC.translate(hx,hy); TC.rotate(a); TC.translate(-hx,-hy); fn(); TC.restore(); };
  const dot = (x,y,r,c) => { TC.fillStyle=c; TC.beginPath(); TC.arc(x,y,r,0,6.283); TC.fill(); };
  // --- dos : paquetage et couverture roulée, puis bloc d'énergie de l'exosquelette
  if (on('back')){
    if (era<=2){
      TC.fillStyle=lgrad(-16,-45,-6,-27,[[0, era===2? '#4a5244':'#7a6a4c'],[1, era===2? '#2a2e28':'#40362a']]); rrectT(-16,-45,10,18,2.5); TC.fill();
      tubeT(-17.5,-47.6,-5,-47.6,2.7, era===2? '#3a4038' : '#8f7f5c');
      TC.fillStyle='rgba(0,0,0,0.35)'; TC.fillRect(-14,-50.4,1.2,5.6); TC.fillRect(-9,-50.4,1.2,5.6);
      if (era>=1){ dot(-15,-29.5,2.7,'#6a7a54'); TC.fillStyle='#3a3026'; TC.fillRect(-15.8,-33.4,1.6,1.6); }       // gourde
    } else if (era===3){
      plateT([-16,-46, -6,-47, -6,-28, -15,-27], exo);
      TC.fillStyle='rgba(0,0,0,0.4)'; for (let i=0;i<3;i++) TC.fillRect(-14.4,-43+i*3.4,5.4,1.3);
      glowDot(-11,-31,1.5,glow,5);
    }
    if (part==='full' && era===4){ TC.fillStyle=lgrad(-16,-46,-4,-8,[[0,'#c8382a'],[1,'#6e1a16']]);
      polyP([-7,-46, -1,-44, -6,-9, -19,-11, -14,-30]); TC.fill(); }                                               // cape (figée ; en jeu elle flotte)
  }
  // --- bras arrière : il porte la hampe du drapeau (l'étoffe est animée en direct par drawHero)
  if (on('armb')){
    const px=R.pole, top=R.ptop[era];
    tubeT(px, -13, px, top, era>=3? 1.1 : 1.25, era>=3? exo : '#7a5632');
    if (era===0) dot(px, top, 1.7, '#5a3e22');
    else if (era<=2){ TC.fillStyle=steel; polyP([px-1.9,top, px,top-6.5, px+1.9,top]); TC.fill(); }
    else if (era===3){ TC.fillStyle=steel; polyP([px-2.2,top, px,top-7.5, px+2.2,top]); TC.fill(); dot(px,top+0.6,1.5,RED); }
    else bloomT(glow,5,()=>drawStar(px, top-3.2, 3.8, gold));
    if (part==='full'){ const fy=top+2, fh=R.fh[era], fl=R.fl[era];
      TC.fillStyle=lgrad(px-fl,fy,px,fy+fh,[[0,'#a81f1c'],[1,RED]]); polyP([px,fy, px-fl,fy+2.5, px-fl+2,fy+fh+3, px,fy+fh]); TC.fill();
      if (era>=1) drawStar(px-fl*0.5, fy+fh*0.5+1.4, fh*0.27, gold); }
    limbT([-3,-42, -9,-37, -10.5,-31.5], 5.2, shade(uni,0.66));
    if (era>=3) plateT([-5.5,-44.5, -1,-43.5, -6,-37.5, -10,-39], shade(exo,0.75));
    dot(-10.6,-31.5,2.6, shade(era>=2? dark : skin, 0.85));
  }
  // --- jambes (3 poses) : treillis, genouillères, montants d'exosquelette
  const legB = () => { limbT([-1,-24, -4,-13, -6,-4], 7, shade(pants,0.72));
    if (era>=3){ TC.strokeStyle=shade(exo,0.55); TC.lineWidth=1.5; strokeP([-3,-24, -7,-13, -8,-5]); TC.stroke(); }
    TC.fillStyle=shade(boot,0.8); rrectT(-11,-6.4,11,6.4,2); TC.fill(); };
  const legF = () => { limbT([2,-24, 5,-13, 5,-4], 7.6, pants);
    if (era>=2) plateT([2.2,-17.5, 8.6,-16.5, 8.2,-10.5, 2.4,-11], era>=3? exo : '#30353b');
    if (era>=3){ TC.strokeStyle=shade(exo,0.7); TC.lineWidth=1.6; TC.lineJoin='round'; strokeP([0.5,-25, 8.4,-14, 8,-5]); TC.stroke(); dot(8.4,-14,2,shade(exo,1.15)); dot(8.4,-14,0.8,'#1a1c22'); }
    TC.fillStyle=lgrad(0,-6.4,0,0,[[0,shade(boot,1.5)],[1,boot]]); rrectT(1,-6.6,12,6.6,2); TC.fill();
    if (era>=3) plateT([6,-7, 13.5,-5.4, 13.5,-1.6, 6,-1.6], exo, false);
    TC.fillStyle='rgba(0,0,0,0.35)'; TC.fillRect(1,-1.4,12,1.4); };
  if (part==='legs'){ const a=pose*0.36; rot(-1,-24,a,legB); rot(2,-24,-a,legF); return; }
  if (part==='full'){ legB(); legF(); }
  // --- tronc + tête
  if (on('body')){
    const sw=9;
    if (era===1 || era===2) plateT([-8.4,-25, 8.4,-25, 9.4,-14.5, 2.4,-15.5, 1,-22, -1,-22, -3,-15, -9.6,-15.5], shade(uni,0.8));   // pans de vareuse
    if (era>=3){ plateT([-8.4,-25, -1,-25, -2,-16, -9,-17.5], shade(exo,0.85)); plateT([1,-25, 8.4,-25, 9.4,-17, 3,-16], exo); }      // tassettes
    plateT([-sw+1,-45.5, sw-1,-45.5, sw,-41, sw-2,-23, -sw+2,-23, -sw,-41], uni);
    TC.strokeStyle='rgba(0,0,0,0.28)'; TC.lineWidth=1;
    if (era<=1){
      TC.fillStyle=shade(skin,0.9); polyP([-0.5,-45.5, 4.5,-45.5, 2,-40]); TC.fill();                                  // col ouvert
      TC.fillStyle=shade(uni,0.8); TC.fillRect(-6,-39.5,4.6,4.6); if (era===1) TC.fillRect(1.6,-39.5,4.6,4.6);         // poches
      TC.lineCap='butt'; TC.strokeStyle='#4a3522'; TC.lineWidth=2.8; strokeP([-sw+2,-44.5, sw-2,-25.5]); TC.stroke();   // cartouchière
      TC.fillStyle='#d8b050'; for (let i=1;i<6;i++) TC.fillRect(-sw+2+i*(2*sw-4)/6-0.8, -44.5+i*19/6-1.4, 1.6, 2.3);
      if (era===1){ TC.fillStyle=shade(uni,1.2); TC.fillRect(3,-46.6,5.4,1.8); }                                       // patte d'épaule
    } else if (era===2){
      plateT([-sw+2,-44.5, sw-1,-44.5, sw-1,-28.5, -sw+2,-28.5], '#30353b');                                           // porte-plaques
      TC.fillStyle='#22262b'; for (let i=0;i<3;i++){ rrectT(-6+i*4.6,-33,3.8,5.4,0.8); TC.fill(); }
      TC.strokeStyle='rgba(255,255,255,0.14)'; for (let i=0;i<2;i++){ strokeP([-sw+3,-41+i*3, sw-2,-41+i*3]); TC.stroke(); }
      TC.fillStyle=lgrad(-5,-49,6,-42,[[0,shade(RED,1.15)],[1,shade(RED,0.72)]]);                                       // foulard rouge
      polyP([-5,-48.5, 5.5,-48, 6,-44.2, -5,-44]); TC.fill(); polyP([-5,-47.5, -11.5,-42, -9.5,-39.5, -4,-44]); TC.fill();
    } else {
      const pc = era===4? '#e6c868' : shade(exo,1.08);
      plateT([-sw+1,-45.5, sw-1,-45.5, sw-1,-34, 0,-30, -sw+1,-34], pc);                                               // plastron
      TC.strokeStyle='rgba(0,0,0,0.3)'; strokeP([-4.5,-28.4, 5.5,-28.4]); TC.stroke(); strokeP([-4,-26, 5,-26]); TC.stroke();
      if (era===3) bloomT(glow,5,()=>{ TC.fillStyle=glow; rrectT(-3,-41,7,1.6,0.8); TC.fill(); });
      else { TC.strokeStyle=shade(pc,0.6); TC.lineWidth=0.9; polyP([-sw+2.4,-44, sw-2.4,-44, sw-2.4,-35, 0,-31.6, -sw+2.4,-35]); TC.stroke();
        bloomT(glow,6,()=>drawStar(0.5,-38.6,3.4,'#fff3c4')); }
      plateT([-3,-48.6, 10.5,-48, 12.5,-40, 0,-38.4], era===4? '#e8c860' : shade(exo,1.15));                           // épaulière
      drawStar(5.4,-43.6,2.5,RED);
    }
    TC.fillStyle='#2a2018'; TC.fillRect(-sw+2,-27,2*sw-4,3.6);                                                        // ceinturon
    TC.fillStyle=era>=1? gold : steel; TC.fillRect(-0.5,-27,3.4,3.6);
    // tête : la même à toutes les ères — c'est elle qui fait le personnage
    const hx=1, hy=-53.5, hr=7.8;
    TC.fillStyle=shade(skin,0.72); TC.fillRect(-2.4,-48.6,5.4,4.2);
    TC.fillStyle=hair; polyP([hx-7.4,hy-3, hx-2.5,hy-2, hx-3,hy+8, hx-9.6,hy+5.6]); TC.fill();                         // cheveux longs
    TC.fillStyle=rgrad(hx-3,hy-3,hr*1.5,[[0,shade(skin,1.12)],[0.65,skin],[1,shade(skin,0.68)]]);
    TC.beginPath(); TC.arc(hx,hy,hr,0,6.283); TC.fill(); dot(hx+7.5,hy+1,1.8,skin);
    TC.fillStyle=shade(skin,0.78); TC.beginPath(); TC.ellipse(hx-2.2,hy+0.6,1.6,2.4,0,0,6.283); TC.fill();            // oreille
    TC.fillStyle=hair; polyP([hx-3.4,hy+1.6, hx+0.5,hy+2.4, hx+8.4,hy+2.2, hx+8.2,hy+6, hx+5.4,hy+9.6, hx+0.4,hy+9.2, hx-3,hy+6.4]); TC.fill();   // barbe
    TC.fillStyle=shade(hair,1.5); TC.fillRect(hx+4.6,hy+2.6,4.4,1.2);                                                  // moustache
    TC.fillStyle='#1a120e'; rrectT(hx+3.6,hy-2.2,2,2.6,0.8); TC.fill(); TC.fillRect(hx+2.4,hy-4.2,4.6,1.1);            // œil, sourcil froncé
    if (era===2){ dot(hx-2.2,hy+0.6,2.3,'#22262b'); TC.strokeStyle='#22262b'; TC.lineWidth=0.9; strokeP([hx-1.5,hy+2.4, hx+4.5,hy+6.2]); TC.stroke(); }   // oreillette
    if (era>=3){ TC.fillStyle='#1a1c22'; rrectT(hx+2.6,hy-3.2,4.6,4,1.3); TC.fill(); TC.fillStyle=glow; rrectT(hx+3.3,hy-2.5,3.2,2.6,0.9); TC.fill(); TC.fillStyle='#1a1c22'; TC.fillRect(hx-6,hy-1.8,9,0.9); }     // monocle tactique
    TC.fillStyle=lgrad(hx-10,hy-11,hx+8,hy-2,[[0,'#34422e'],[1,'#141c12']]);                                           // béret
    TC.beginPath(); TC.ellipse(hx-0.9,hy-6.4,10.6,4.6,-0.2,0,6.283); TC.fill();
    TC.fillStyle='#141c12'; TC.fillRect(hx-7.4,hy-4.6,14.6,1.5); dot(hx-3.6,hy-10.9,0.9,'#141c12');
    if (era===4){ TC.fillStyle=gold; TC.fillRect(hx-7.4,hy-4.4,14.6,1); bloomT(glow,5,()=>drawStar(hx+3.6,hy-7.6,2.7,'#fff0c0')); }
    else drawStar(hx+3.6,hy-7.6,2.6,'#e8322a');
    TC.fillStyle='#7a4c2a'; TC.fillRect(hx+7.6,hy+3.8,5.6,1.6); TC.fillStyle='#d8d0c0'; TC.fillRect(hx+12.2,hy+3.8,1.4,1.6);   // cigare
    glowDot(hx+13.8,hy+4.6,0.8,'#ff7a3a',4);
  }
  // --- bras avant + fusil (tenu à la hanche ; le bras pivote à l'épaule pour viser, tirer, pointer)
  if (on('arm')){
    const y=-36.6;
    if (era<=1){
      TC.fillStyle=lgrad(-3,y-2,22,y+4,[[0,'#a06838'],[1,'#5a3418']]);
      polyP([-3,y-2.4, 7,y-1.5, 12,y-0.2, 22,y-0.2, 22,y+1.6, 9,y+2, 4,y+4, -3,y+3.4]); TC.fill();
      tubeT(10,y-1.3, 33,y-1.3, 1.15,'#565a60'); dot(12,y+1.9,1.1,steel);
      TC.fillStyle='#2a2c30'; TC.fillRect(31,y-3.6,1.2,1.6);
      if (era===1){ TC.fillStyle='#d4d8de'; polyP([33,y-2.3, 40.5,y-1.3, 33,y-0.3]); TC.fill(); }                      // baïonnette
    } else if (era===2){
      TC.fillStyle='#24272b'; polyP([-3,y-2.4, 19,y-2.4, 19,y+1.2, 8,y+2, 3,y+3.6, -3,y+2.6]); TC.fill();
      TC.fillStyle=lgrad(13,y-2,22,y+2,[[0,'#a06838'],[1,'#6a3e1e']]); rrectT(13,y-0.4,9,2.6,1); TC.fill();           // garde-main en bois
      TC.fillStyle='#1a1c20'; polyP([8.5,y+1.6, 12.5,y+1.6, 15.6,y+8, 11.8,y+8.4]); TC.fill();                         // chargeur courbe
      tubeT(19,y-1.2, 31,y-1.2, 1.05,'#3a3c40'); TC.fillStyle='#1a1c20'; TC.fillRect(28.6,y-3.6,1.3,2);
      tubeT(3,y-4.6, 12,y-4.6, 1.5,'#1e2024'); TC.fillStyle='rgba(140,220,255,0.9)'; TC.fillRect(11.4,y-5.4,0.9,1.6);  // lunette
    } else {
      const bc = era===4? '#ecd27e' : '#c4c9d4';
      plateT([-3,y-3, 21,y-2.6, 27,y-0.5, 21,y+2, 7,y+2.4, 2,y+3.8, -3,y+2.6], bc);
      TC.fillStyle=shade(bc,0.45); TC.fillRect(6,y+0.5,15,1.2);
      for (let i=0;i<3;i++) glowDot(11+i*3.6,y-0.6,0.9,glow,4);
      bloomT(glow,6,()=>{ TC.fillStyle=era===4? '#fff3c4' : glow; polyP([27,y-1.5, 33+(era-3)*2,y-0.9, 36+(era-3)*3,y-0.4, 27,y+0.5]); TC.fill(); });   // lame d'énergie
      glowDot(27.5,y-0.5,1.4,glow,5);
    }
    limbT([2,-42, 4.5,-33.5], 6, shade(uni,0.95));
    limbT([4.5,-33.5, 11,-35.4], 5.4, era<=1? skin : era>=3? shade(exo,0.95) : shade(uni,0.9));
    if (era<=1){ TC.fillStyle=shade(uni,1.12); TC.save(); TC.translate(4.5,-33.5); TC.rotate(-0.28); TC.fillRect(-1,-3.4,3,6.8); TC.restore(); }   // manche retroussée
    if (era>=3) plateT([4,-36.8, 10,-38.4, 11,-33.6, 5,-31.4], shade(exo,1.1));
    if (era<=2) bandT(2,-42,4.5,-33.5,0.5,6.8,RED);                                                                   // brassard rouge
    TC.fillStyle=lgrad(9,-38,13,-33,[[0,shade(era>=2? dark : skin,1.2)],[1,shade(era>=2? dark : skin,0.75)]]);
    TC.beginPath(); TC.arc(11,-35.4,2.9,0,6.283); TC.fill();
  }
}

/* ---------- LA SINGULARITÉ : prototype de récupération → coque → châssis de guerre → séraphin → cristal ---------- */
function drawAgi(era, part, pose){
  const on = p => part==='full' || part===p;
  const lite = '#ff6ad6', frame = '#262b33', joint = '#14171c';
  const plate = ['#8f8b7a','#d2cdc0','#5e6875','#e6e2ec','#b792e6'][era];
  const trim  = ['#e8b830','#9aa0aa','#343a44','#4a3668','#f4e6ff'][era];
  const rot = (hx,hy,a,fn) => { if (!a) return fn(); TC.save(); TC.translate(hx,hy); TC.rotate(a); TC.translate(-hx,-hy); fn(); TC.restore(); };
  const dot = (x,y,r,c) => { TC.fillStyle=c; TC.beginPath(); TC.arc(x,y,r,0,6.283); TC.fill(); };
  const shard = (x,y,w,h,c) => { TC.fillStyle=shade(c,1.3); polyP([x,y-h, x+w,y, x,y+h*0.2]); TC.fill(); TC.fillStyle=shade(c,0.8); polyP([x,y-h, x-w,y, x,y+h*0.2]); TC.fill();
    TC.fillStyle=shade(c,0.6); polyP([x-w,y, x,y+h, x+w,y, x,y+h*0.2]); TC.fill(); };
  // --- dos : ailerons du châssis de guerre, halo du séraphin, couronne du cristal
  if (on('back')){
    if (era===0){ TC.strokeStyle='#3a3026'; TC.lineWidth=1.3; TC.lineCap='round';                                      // câbles qui pendent
      for (const [a,b,c] of [[-9,-36,'#b0402a'],[-7,-33,'#c8a030']]){ TC.strokeStyle=c; TC.beginPath(); TC.moveTo(a,-46); TC.quadraticCurveTo(a-7,b,a+2,-29); TC.stroke(); }
      plateT([-15,-50, -9,-50, -9,-38, -15,-38], shade(plate,0.7)); }                                                  // batterie de récupération
    else if (era===1){ plateT([-12,-49, -7,-51, -6,-36, -11,-34], shade(plate,0.72)); }                                // épine dorsale
    else if (era===2){ for (const [x,h] of [[-12,-64],[-8,-58]]) plateT([x,-47, x+4.5,-48, x+1,h, x-2.5,h+5], shade(plate,0.8)); }   // ailerons
    else if (era===3){ bloomT(lite,6,()=>{ TC.strokeStyle=rgbaC(lite,0.9); TC.lineWidth=1.5; TC.beginPath(); TC.arc(0,-60,12.5,Math.PI*0.95,Math.PI*2.05); TC.stroke(); });
      for (const [x,y] of [[-13,-50],[-15,-41]]) plateT([x,y-5, x+4,y-3, x+3,y+4, x-1.5,y+5], shade(plate,0.82)); }    // pennes dorsales
    else { bloomT(lite,7,()=>{ TC.strokeStyle=rgbaC(lite,0.95); TC.lineWidth=1.4; TC.beginPath(); TC.ellipse(1,-73,9.5,2.6,0,0,6.283); TC.stroke(); });
      for (const [x,y,h] of [[-14,-48,8],[-17,-36,6],[-12,-27,4]]) shard(x,y,h*0.42,h,plate); }
  }
  // --- bras arrière : il se termine par un émetteur (l'attaque « faisceau » part de sa paume)
  if (on('armb')){
    if (era===4){ shard(-6.5,-36,2.6,8,plate); shard(-5,-27.5,2,4.6,plate); glowDot(-5,-27,1.5,lite,5); }
    else { limbT([-3,-44, -7,-35, -5,-27], era===0? 5.2 : 4.4, shade(frame,0.85));
      if (era>=2) plateT([-5.6,-46.4, -0.8,-45, -4.6,-38, -8.8,-39.4], shade(plate,0.74));
      dot(-5,-27,2.9,joint); TC.strokeStyle=shade(plate,0.8); TC.lineWidth=0.9; TC.beginPath(); TC.arc(-5,-27,2.9,0,6.283); TC.stroke();
      glowDot(-5,-27,1.4,lite,5); }
  }
  // --- jambes : vérins du prototype, pattes digitigrades, queue de cristal (ère 4 : elle lévite)
  const lw = era===0? 6.6 : era===3? 4.6 : 5.4, lb = shade(frame,0.8);
  const legB = () => {
    if (era===4){ shard(-3,-14,2.6,7,shade(plate,0.8)); return; }
    limbT([-2,-25, 1,-15], lw+0.6, lb); limbT([1,-15, -4,-5], lw-0.4, lb);
    plateT([-9,0, 2,0, 0,-4.4, -6,-5.4], shade(plate,0.62)); };
  const legF = () => {
    if (era===4){ TC.fillStyle=shade(plate,1.25); polyP([-6,-31, 1,-32, 0,-8]); TC.fill(); TC.fillStyle=shade(plate,0.72); polyP([1,-32, 7,-30, 0,-8]); TC.fill();
      TC.strokeStyle=rgbaC(lite,0.6); TC.lineWidth=0.7; strokeP([1,-32, 0,-8]); TC.stroke(); shard(1.5,-2.5,1.8,3.4,plate); return; }
    limbT([2,-25, 7,-15], lw+0.6, frame); limbT([7,-15, 2,-5], lw-0.4, frame);
    TC.strokeStyle='#8a929c'; TC.lineWidth=1.1; strokeP([3,-21, 4,-9]); TC.stroke();                                   // vérin
    plateT([1,-28.5, 9,-25.5, 9,-18, 3,-16.5], era===0? shade(plate,0.95) : plate);
    if (era===0) for (let i=0;i<3;i++){ TC.fillStyle=i%2? '#1a1a1a' : '#e8b830'; polyP([2.6+i*2.1,-17.4, 4.7+i*2.1,-17.6, 5.3+i*2.1,-19.6, 3.2+i*2.1,-19.4]); TC.fill(); }
    dot(7,-15,2.6,joint); if (era>=3) glowDot(7,-15,1,lite,4);
    plateT([-2,0, 12,0, 9.4,-4.4, 1,-5.4], shade(plate,0.9)); };
  if (part==='legs'){ if (era===4){ legB(); legF(); return; } const a=pose*0.3; rot(-2,-25,a,legB); rot(2,-25,-a,legF); return; }
  if (part==='full'){ legB(); legF(); }
  // --- châssis + tête
  if (on('body')){
    if (era<4){ plateT([-6,-31, 6,-31, 5,-23.5, -5,-23.5], frame); TC.fillStyle=joint; TC.fillRect(-3,-34,6,4); }     // bassin + colonne
    let hy = -57;
    const core = (x,y,r) => { TC.fillStyle=joint; polyP([x,y-r-1.2, x+r+1,y, x,y+r+1.2, x-r-1,y]); TC.fill();           // cœur losange : sa signature
      bloomT(lite,6,()=>{ TC.fillStyle=lite; polyP([x,y-r, x+r*0.82,y, x,y+r, x-r*0.82,y]); TC.fill(); });
      TC.fillStyle='rgba(255,255,255,0.85)'; polyP([x-0.4,y-r*0.6, x+r*0.3,y-r*0.1, x-0.4,y+r*0.1, x-r*0.4,y-r*0.2]); TC.fill(); };
    const crown = (x,y,h,c) => { for (const [dx,k] of [[-3.6,0.72],[0,1],[3.6,0.72]]){ TC.fillStyle=c; polyP([x+dx-1.3,y, x+dx+1.3,y, x+dx,y-h*k]); TC.fill(); } };   // couronne à trois pointes
    if (era===0){
      plateT([-10,-50, 10,-50, 10,-31, -10,-31], plate);                                                              // baie de serveur
      TC.fillStyle='rgba(0,0,0,0.42)'; for (let i=0;i<2;i++) TC.fillRect(-8,-47.8+i*2.4,7,1.3);
      TC.fillStyle='#39d06a'; TC.fillRect(-0.2,-47.4,1.2,1.2); TC.fillStyle='#e8b830'; TC.fillRect(-0.2,-44.7,1.2,1.2);
      for (let i=0;i<7;i++){ TC.fillStyle=i%2? '#1a1a1a' : '#e8b830'; polyP([-10+i*2.9,-31, -7.1+i*2.9,-31, -8.4+i*2.9,-33.6, -11.3+i*2.9,-33.6]); TC.fill(); }
      TC.fillStyle='rgba(255,255,255,0.5)'; for (const [x,y] of [[-8.6,-48.6],[8.6,-48.6],[8.6,-35.4]]){ TC.beginPath(); TC.arc(x,y,0.7,0,6.283); TC.fill(); }
      TC.fillStyle=shade(plate,0.6); polyP([-8.6,-42.6, -1,-43, -1.4,-34.6, -8.6,-34.4]); TC.fill();                         // plaque soudée de travers
      core(-4.6,-38.4,2.3);
      hy = -59; TC.fillStyle=frame; TC.fillRect(-2,-53,5,3.4);
      plateT([-7.5,hy-6.6, 8.5,hy-6.6, 8.5,hy+5.6, -7.5,hy+5.6], shade(plate,1.06));                                  // tête-moniteur
      TC.fillStyle='#0b1016'; rrectT(-1.6,hy-4.4,8.6,7.6,1.4); TC.fill();
      TC.strokeStyle='#8a929c'; TC.lineWidth=0.9; TC.beginPath(); TC.arc(3,hy-0.6,2.9,0,6.283); TC.stroke(); glowDot(3.3,hy-0.6,1.7,lite,6);
      TC.strokeStyle=frame; TC.lineWidth=1.1; TC.lineCap='round';
      for (const [dx,tx,ty] of [[-4.6,-6.8,-8.6],[-1.6,-1.6,-10.8],[1.4,3.6,-8.6]]){ strokeP([dx,hy-6.6, tx,hy-6.6+ty+6.6]); TC.stroke(); }   // antennes : la couronne à venir
      glowDot(-1.6,hy-11.2,1,'#ff5a4a',3);
    } else if (era===1){
      plateT([-8,-50, 8,-50, 10,-46.5, 9.4,-36, 6,-31, -6,-31, -9.4,-36, -9.4,-46.5], plate);                         // coque lisse
      TC.strokeStyle='rgba(0,0,0,0.26)'; TC.lineWidth=0.9; strokeP([-9,-38.4, 9.4,-38.4]); TC.stroke(); strokeP([0.5,-50, 0.5,-31]); TC.stroke();
      core(-4,-43.6,2.5);
      TC.fillStyle=frame; TC.fillRect(-2,-53,5,3.4);
      TC.fillStyle=lgrad(-8,hy-8,9,hy+6,[[0,shade(plate,1.3)],[0.5,plate],[1,shade(plate,0.56)]]);
      TC.beginPath(); TC.ellipse(1,hy-0.6,8.2,7.2,0,0,6.283); TC.fill();
      TC.fillStyle='#0a1016'; rrectT(0.4,hy-3,8.6,3.6,1.6); TC.fill();
      bloomT(lite,6,()=>{ TC.fillStyle=lite; rrectT(1.4,hy-2.2,6.8,1.9,0.9); TC.fill(); });                            // fente de visée
      crown(0.6,hy-7,5.4,trim);
    } else if (era===2){
      plateT([-10,-50, 11.5,-49, 9.6,-37, 3,-31, -4,-31, -9,-38], plate);                                             // blindage anguleux
      TC.strokeStyle='rgba(0,0,0,0.34)'; TC.lineWidth=0.9; strokeP([-9,-48, 1,-38, 11,-47]); TC.stroke();
      TC.fillStyle=trim; polyP([-8,-36.4, 8.6,-36.4, 4,-32, -4.6,-32]); TC.fill();
      core(-3.4,-42.4,2.5);
      plateT([-2,-53, 12.5,-52, 14.6,-43.6, 0.6,-41.6], shade(plate,1.14));                                           // épaulière massive
      TC.strokeStyle=rgbaC(lite,0.8); TC.lineWidth=1; strokeP([1.6,-50.6, 11.6,-49.8]); TC.stroke();
      TC.fillStyle=frame; TC.fillRect(-2,-53.4,5,3.6);
      plateT([-7,hy-6.6, 5.6,hy-6.6, 9.4,hy-1.4, 5.6,hy+4.6, -7,hy+4.6], plate);
      TC.fillStyle='#0a1016'; polyP([0,hy-4, 8.6,hy-3.2, 5,hy+0.6]); TC.fill();
      bloomT(lite,6,()=>{ TC.strokeStyle=lite; TC.lineWidth=1.4; strokeP([1.2,hy-3.2, 5,hy-0.6, 8,hy-2.8]); TC.stroke(); });   // visière en V
      TC.strokeStyle='rgba(0,0,0,0.35)'; TC.lineWidth=0.8; for (let i=0;i<2;i++){ strokeP([1.6+i*2,hy+1.8, 1.6+i*2,hy+3.8]); TC.stroke(); }
      crown(-1,hy-6.6,7,shade(plate,1.12));
    } else if (era===3){
      hy = -60;
      plateT([-7.6,-51, 8.6,-51, 6.6,-37, 2,-31, -3,-31, -6.6,-37], plate);                                           // buste effilé
      TC.fillStyle=trim; polyP([-5.6,-37, 6,-37, 2,-31.6, -3,-31.6]); TC.fill();
      bloomT(lite,5,()=>{ TC.fillStyle=lite; TC.fillRect(0,-39.4,1.5,7); });                                           // colonne lumineuse
      core(-3,-45,2.4);
      plateT([1.6,-56, 13.6,-55.2, 15.6,-48.6, 3.6,-47], shade(plate,1.08));                                          // épaulière flottante
      TC.fillStyle=trim; TC.fillRect(-1.6,-56,4.4,5.4);
      plateT([-6,hy-6.4, 4.4,hy-6.4, 7.6,hy-1.6, 4.4,hy+4.6, -6,hy+4.6], plate);
      TC.fillStyle=trim; polyP([-6,hy-6.4, -1.5,hy-6.4, -3,hy+4.6, -6,hy+4.6]); TC.fill();
      bloomT(lite,6,()=>{ TC.fillStyle=lite; rrectT(0.6,hy-2.8,6.2,1.8,0.9); TC.fill(); });
      crown(-0.6,hy-6.4,9.5,plate);
    } else {
      hy = -62;
      TC.fillStyle=shade(plate,1.38); polyP([-9.6,-50, 1,-53, 2,-39]); TC.fill();                                     // buste de cristal
      TC.fillStyle=shade(plate,1.05); polyP([1,-53, 11.6,-49, 2,-39]); TC.fill();
      TC.fillStyle=shade(plate,0.74); polyP([-9.6,-50, 2,-39, 11.6,-49, 8,-36, 1.6,-30, -4,-31, -8,-37]); TC.fill();
      TC.strokeStyle=rgbaC('#ffffff',0.5); TC.lineWidth=0.7; strokeP([-9.6,-50, 2,-39, 11.6,-49]); TC.stroke(); strokeP([1,-53, 2,-39, 1.6,-30]); TC.stroke();
      core(1.6,-44.4,2.9);
      for (const [x,y,h] of [[12.5,-52.6,5.4],[-9,-55,4.2]]) shard(x,y,h*0.5,h,plate);                                 // épaules en éclats
      TC.fillStyle=shade(plate,1.4); polyP([1,hy-9.5, 8.6,hy-0.6, 1,hy+1]); TC.fill();                                // tête taillée
      TC.fillStyle=shade(plate,1.05); polyP([1,hy-9.5, -6.6,hy-0.6, 1,hy+1]); TC.fill();
      TC.fillStyle=shade(plate,0.68); polyP([-6.6,hy-0.6, 8.6,hy-0.6, 1,hy+6.4]); TC.fill();
      glowDot(4,hy-1.4,1.7,lite,6);
      crown(1,hy-10.6,6,trim);
    }
  }
  // --- bras avant + lame (pince du prototype → couperet → mono-lame → lame d'énergie → lame de cristal)
  if (on('arm')){
    const hx=15, hyy=-47;
    if (era<4){ limbT([3,-44, 10,-41, hx,hyy], era===0? 5.4 : 4.6, frame);
      plateT([0.6,-46.6, 6,-46.4, 11.6,-40, 8.2,-39.6], era===0? shade(plate,0.9) : shade(plate,1.05)); }
    TC.save(); TC.translate(hx,hyy); TC.rotate(-0.8);
    if (era===0){                                                                                                      // pince hydraulique
      TC.fillStyle=frame; rrectT(-2,-3,7,6,1.4); TC.fill();
      plateT([4,-3.6, 15,-6.4, 19,-3.4, 16,-1.4, 6,-0.6], '#9a9ea2'); plateT([4,3.6, 14,6, 18.6,3.2, 15.6,1.4, 6,0.6], '#84888c');
      for (let i=0;i<3;i++){ TC.fillStyle=i%2? '#1a1a1a' : '#e8b830'; TC.fillRect(-1.6+i*2.1,-3,2.1,1.6); }
      dot(3.6,0,1.5,joint);
    } else if (era===1){ TC.fillStyle=frame; rrectT(-2,-2.4,6,4.8,1.2); TC.fill();
      TC.fillStyle=lgrad(0,-7,0,3,[[0,'#f0f4f8'],[1,'#6a727c']]); polyP([2,-2, 18,-7, 22.6,0.6, 3,2.4]); TC.fill();     // couperet
      TC.fillStyle='rgba(255,255,255,0.7)'; TC.fillRect(4,1,17,0.7);
    } else if (era===2){ TC.fillStyle=frame; rrectT(-3,-3,8,6,1.4); TC.fill();
      TC.fillStyle=lgrad(0,-3,0,3,[[0,'#f4f8fc'],[1,'#7a828c']]); polyP([3,-2.2, 26,-1, 29,0.4, 3,2.2]); TC.fill();     // mono-lame
      TC.fillStyle=trim; TC.fillRect(3,-0.4,20,0.9); glowDot(1,0,1.1,lite,4);
    } else if (era===3){ TC.fillStyle=trim; rrectT(-3,-2.6,7,5.2,1.4); TC.fill();
      bloomT(lite,7,()=>{ TC.fillStyle=lite; polyP([3,-2.1, 27,-1.3, 31.6,0, 27,1.3, 3,2.1]); TC.fill(); });           // lame d'énergie
      TC.fillStyle='rgba(255,255,255,0.92)'; TC.fillRect(4,-0.45,23,0.9);
    } else {
      TC.rotate(0.8); shard(-9,5.5,2.4,6,plate); TC.rotate(-0.8);                                                      // avant-bras détaché
      TC.fillStyle=shade(plate,1.4); polyP([-2,0, 8,-3.4, 34,0]); TC.fill();                                          // lame de cristal
      TC.fillStyle=shade(plate,0.78); polyP([-2,0, 8,3, 34,0]); TC.fill();
      bloomT(lite,6,()=>{ TC.strokeStyle=rgbaC(lite,0.9); TC.lineWidth=0.9; strokeP([-1,0, 33,0]); TC.stroke(); });
    }
    TC.restore();
  }
}

/* ---------- habillage en direct : étoffe, éclats, sceau au sol ---------- */
// bande d'étoffe attachée en (ax, ay..ay+h), qui traîne vers l'arrière : aplats + trait d'encre (aucun dégradé)
function heroCloth(g, ax, ay, h, len, t, stream, unf, col, col2, star){
  const N = 5, T = [], B = [];
  for (let i=0;i<=N;i++){ const k = i/N, x = ax - len*unf*k*(0.86+0.14*stream);
    const wv = Math.sin(t*0.9 - i*1.15)*(0.8+2.4*k)*(0.45+0.55*stream), droop = (1-stream)*k*k*h*0.6;
    T.push(x, ay + wv*0.55 + droop); B.push(x, ay + h + wv + droop*1.2 - k*h*0.1); }
  g.beginPath(); g.moveTo(T[0],T[1]); for (let i=1;i<=N;i++) g.lineTo(T[i*2],T[i*2+1]);
  for (let i=N;i>=0;i--) g.lineTo(B[i*2],B[i*2+1]); g.closePath();
  g.fillStyle = col; g.fill();
  g.fillStyle = col2;                                                                    // plis
  for (const i of [1,3]){ g.beginPath(); g.moveTo(T[i*2],T[i*2+1]); g.lineTo(T[i*2+2],T[i*2+3]); g.lineTo(B[i*2+2],B[i*2+3]); g.lineTo(B[i*2],B[i*2+1]); g.closePath(); g.fill(); }
  if (star && unf>0.7){ const sx=(T[4]+T[6]+B[4]+B[6])/4, sy=(T[5]+T[7]+B[5]+B[7])/4, r=h*0.27; g.fillStyle=star; g.beginPath();
    for (let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr2=i%2? r*0.45 : r; g.lineTo(sx+Math.cos(a)*rr2, sy+Math.sin(a)*rr2); } g.closePath(); g.fill(); }
  g.beginPath(); g.moveTo(T[0],T[1]); for (let i=1;i<=N;i++) g.lineTo(T[i*2],T[i*2+1]);
  for (let i=N;i>=0;i--) g.lineTo(B[i*2],B[i*2+1]); g.closePath();
  g.strokeStyle = HERO_INK; g.lineWidth = 0.9; g.lineJoin = 'round'; g.stroke();
}
// sceau à l'encre posé au sol sous le héros (remplace l'anneau lumineux) + repère sous les alliés galvanisés
function heroSeal(fac){
  return fxSprite('HSEAL'+fac, 104, 34, g => { const hum = fac==='HUM', c = hum? '#8a2a1c' : '#7a2a86';
    g.translate(52,17); g.strokeStyle = c; g.fillStyle = c; g.lineCap='round';
    g.save(); g.scale(1,0.3);
    if (hum){ g.lineWidth=2.2; g.setLineDash([9,5]); g.beginPath(); g.arc(0,0,46,0,6.283); g.stroke();
      g.setLineDash([]); g.lineWidth=1.1; g.beginPath(); g.arc(0,0,39,0,6.283); g.stroke();
      for (let i=0;i<5;i++){ const a=-Math.PI/2+i*6.283/5; g.beginPath(); g.moveTo(Math.cos(a)*39,Math.sin(a)*39); g.lineTo(Math.cos(a+2.513)*39,Math.sin(a+2.513)*39); g.stroke(); } }
    else { for (const [r,lw] of [[46,2],[36,1.1]]){ g.lineWidth=lw; g.beginPath(); for (let i=0;i<=6;i++){ const a=i*Math.PI/3; g.lineTo(Math.cos(a)*r,Math.sin(a)*r); } g.stroke(); }
      g.lineWidth=1.1; for (let i=0;i<6;i++){ const a=i*Math.PI/3; g.beginPath(); g.moveTo(Math.cos(a)*36,Math.sin(a)*36); g.lineTo(Math.cos(a)*24,Math.sin(a)*24); g.stroke(); }
      g.beginPath(); g.moveTo(0,-14); g.lineTo(11,0); g.lineTo(0,14); g.lineTo(-11,0); g.closePath(); g.stroke(); }
    g.restore(); });
}
function heroPip(fac, x, gy){
  const sp = fxSprite('HPIP'+fac, 16, 8, g => { const hum = fac==='HUM'; g.translate(8,4); g.scale(1,0.5);
    g.fillStyle = hum? '#a8281c' : '#b23cc0'; g.strokeStyle = HERO_INK; g.lineWidth = 1.2; g.lineJoin='round'; g.beginPath();
    if (hum) for (let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2? 2.6 : 6; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
    else { g.moveTo(0,-6); g.lineTo(5,0); g.lineTo(0,6); g.lineTo(-5,0); }
    g.closePath(); g.stroke(); g.fill(); });
  ctx.drawImage(sp, x-8, gy+1, 16, 8);
}
function heroShadow(fac, era, x, gy, dir){
  const sh = fxSprite('HSH'+fac+era, HSP.W, HSP.H, g => {
    g.drawImage(heroPart(fac,era,'body'), 0, 0, HSP.W, HSP.H); g.drawImage(heroPart(fac,era,'arm'), 0, 0, HSP.W, HSP.H);
    g.drawImage(heroPart(fac,era,'armb'), 0, 0, HSP.W, HSP.H);
    g.drawImage(heroPart(fac,era,'legs',0), HSP.cx+HLEG.ox, HSP.foot+HLEG.oy, HLEG.W, HLEG.H);
    g.globalCompositeOperation='source-in'; g.fillStyle='#07060b'; g.fillRect(0,0,HSP.W,HSP.H); });
  const dev = game? game.dev : 0, A0 = ctx.globalAlpha;
  ctx.save(); ctx.globalAlpha = A0*(0.26 - 0.08*dev);
  ctx.translate(x, gy+1.5); ctx.transform(dir, 0, 0.75+0.9*dev, 0.24+0.1*dev, 0, 0);
  ctx.drawImage(sh, -HSP.cx, -HSP.foot, HSP.W, HSP.H); ctx.restore();
}
function heroShard(){
  return fxSprite('HSHARD', 10, 16, g => { g.translate(5,8); g.lineJoin='round';
    g.beginPath(); g.moveTo(0,-7); g.lineTo(3.4,0); g.lineTo(0,7); g.lineTo(-3.4,0); g.closePath(); g.strokeStyle=HERO_INK; g.lineWidth=1.6; g.stroke();
    g.fillStyle='#f0d2ff'; g.beginPath(); g.moveTo(0,-7); g.lineTo(3.4,0); g.lineTo(0,1.4); g.closePath(); g.fill();
    g.fillStyle='#c48ae8'; g.beginPath(); g.moveTo(0,-7); g.lineTo(-3.4,0); g.lineTo(0,1.4); g.closePath(); g.fill();
    g.fillStyle='#8a52b8'; g.beginPath(); g.moveTo(-3.4,0); g.lineTo(0,7); g.lineTo(3.4,0); g.lineTo(0,1.4); g.closePath(); g.fill(); });
}

/* ---------- pose animée ---------- */
const hSm = k => k*k*(3-2*k);
// renvoie la pose de l'image : angles des bras (rad), avance du bras, fente, bascule, tassement…
function heroPose(u, moving, ph){
  const hum = u.fac==='HUM', guest = game.net==='guest';
  const h = u._h || (u._h = { a:0, b:0 });
  const mult = (!guest && u.tiredT>0)? (hum? 1.3 : 1.5) : 1;
  const ts = u.rate*mult - u.atkT;                                    // temps écoulé depuis la frappe
  const wind = (u.atkT>0 && u.atkT<0.26)? hSm(1-u.atkT/0.26) : 0;     // armement, juste avant la suivante
  const n = u.atkN|0, vNext = HERO_SEQ[n&7], vLast = HERO_SEQ[(n+7)&7];
  const P = { af:0, ab:0, ax:0, lunge:0, tilt:0, sy:1+0.022*Math.sin(u.bob*0.37), ts, v:vLast, hit:ts>=0 && ts<0.45, wind, vNext };
  let a = 0.022*Math.sin(u.bob*0.37), b = 0.03*Math.sin(u.bob*0.3+1);
  if (hum){ a += moving? 0.2 + Math.sin(ph*2)*0.04 : 0.1; b += moving? 0.08 + Math.sin(ph)*0.035 : 0; }
  else if (moving){ a += Math.sin(ph)*0.15; b -= Math.sin(ph)*0.15; }
  // geste de ralliement (aboiement) : le Che brandit son fusil, la Singularité ouvre les bras
  const gt = u.gestT!=null? game.t - u.gestT : 9;
  if (gt>=0 && gt<1.1 && !P.hit && !wind){ const k = Math.sin(Math.min(1,gt/1.1)*Math.PI); const e = hSm(Math.min(1,k*1.6));
    if (hum){ a = lerp(a, -1.2, e); b -= 0.06*e; } else { a = lerp(a, -0.55, e); b = lerp(b, 0.5, e); } P.gest = e; }
  h.a += (a-h.a)*0.2; h.b += (b-h.b)*0.2;                              // les poses lentes sont lissées
  let fa = 0, fb = 0;
  if (P.hit){
    const imp = Math.max(0, 1-ts/0.16);
    if (hum && vLast===0){                                             // TIR : recul sec, le buste part en arrière
      fa = ts<0.05? -0.17*ts/0.05 : -0.17*Math.pow(1-(ts-0.05)/0.4, 2); fa -= h.a*Math.max(0,1-ts/0.3)*0.8;
      P.lunge = -5*imp; P.tilt = -0.07*imp;
    } else if (hum){                                                   // COUP DE BAÏONNETTE : fente avant
      const k = ts<0.08? ts/0.08 : Math.pow(1-(ts-0.08)/0.37, 2);
      P.ax = ts<0.08? lerp(-7, 13, k) : 13*k; P.lunge = 11*k; P.tilt = 0.14*k; fa = -h.a*k - 0.05*k;
    } else if (vLast===0){                                             // TAILLE : la lame s'abat
      fa = ts<0.07? lerp(-1.05, 0.95, ts/0.07) : 0.95*Math.pow(1-(ts-0.07)/0.38, 2);
      P.lunge = 10*imp; P.tilt = 0.12*imp;
    } else {                                                           // FAISCEAU : paume tendue, léger recul
      fb = ts<0.22? -1.45 : -1.45*Math.pow(1-(ts-0.22)/0.23, 2); P.lunge = -4*imp; P.tilt = -0.05*imp;
    }
  } else if (wind){
    if (hum && vNext===0){ fa = -h.a*wind*0.8; }                       // épaule le fusil
    else if (hum){ P.ax = -7*wind; fa = -h.a*wind - 0.05*wind; P.lunge = -3*wind; P.tilt = -0.08*wind; }
    else if (vNext===0){ fa = -1.05*wind; P.tilt = -0.05*wind; }
    else fb = -1.45*wind;
  }
  P.af = h.a + fa; P.ab = h.b + fb;
  return P;
}

/* ---------- rendu en jeu ---------- */
function drawHero(u, x, gy){
  const fac = u.fac, hum = fac==='HUM', era = heroEra(u.era), S = HERO_S[fac][era], R = HERO_RIG[fac];
  const t = u.bob, A0 = ctx.globalAlpha, rich = qFx();
  const mv = Math.abs(u.x-(u._wx!=null? u._wx : u.x)); u._wx = u.x;
  const moving = mv>0.04, ph = t*1.1;
  let dir = u.side; if (u.hstate==='flee' && moving) dir = -dir;      // repli prudent : il tourne le dos et court vers sa base
  const float = !hum && era===4;                                       // la Singularité cristalline lévite
  const sp = Math.sin(ph), pose = (float || !moving || Math.abs(sp)>0.7)? 0 : (Math.cos(ph)>0? 1 : -1);
  const P = heroPose(u, moving, ph);
  let dy = float? -7 - 3*Math.sin(t*0.45) : (moving? -Math.abs(sp)*3 : 0);
  let sy = P.sy, tilt = P.tilt, lunge = P.lunge, unf = 1, clipK = 1;
  if (moving && !float) tilt += 0.03;                                  // penché dans la marche
  if (u.flash>0 && !P.hit){ tilt -= Math.min(0.16, u.flash*1.1); sy *= 0.93; lunge -= 3*Math.min(1,u.flash*8); }   // encaisse : le buste part en arrière
  // victoire : la légende exulte
  const cheer = game.over && ((u.side===1)===!!game.win);
  if (cheer){ dy -= Math.abs(Math.sin(performance.now()/210 + t))*6; P.af = hum? -1.2 + 0.2*Math.sin(performance.now()/190) : -0.6; if (!hum) P.ab = 0.5; }
  // ENTRÉE EN SCÈNE (0,9 s) : le Che saute dans la mêlée et son drapeau se déploie ; la Singularité se matérialise
  const age = u._born!=null? game.t - u._born : 9, ent = clamp(age/0.9, 0, 1);
  if (ent<1){
    if (hum){ const k1 = Math.min(1, ent/0.45); dy -= (1-k1*k1)*74; unf = hSm(ent);
      if (ent>=0.45){ const k2 = (ent-0.45)/0.55; sy *= 1 - 0.2*Math.sin(k2*Math.PI)*(1-k2); P.af = lerp(-1.2, P.af, hSm(k2));
        if (!u._h.land){ u._h.land = 1; if (rich && particles.length<470) for (let i=0;i<8;i++) particles.push({k:'u', x:u.x+(Math.random()-0.5)*34, y:gy-2, vx:(Math.random()-0.5)*70, vy:-10-Math.random()*16, g:-4, dr:1.8, life:0.7+Math.random()*0.4, t:0, r:4+Math.random()*4});
          game.shake = Math.max(game.shake||0, 5); } }
      else P.af = -1.2; }
    else { clipK = hSm(ent); if (rich && particles.length<470 && Math.random()<0.5){ const a=Math.random()*6.283;
        particles.push({k:'s', x:u.x+Math.cos(a)*46, y:gy-60*S*0.6+Math.sin(a)*46, vx:-Math.cos(a)*120, vy:-Math.sin(a)*120, g:0, dr:1, life:0.34, t:0, color:'#ff9ae6', r:1.4}); } }
  }
  // --- sol : sceau à l'encre + ombre portée
  if (rich){ ctx.globalAlpha = A0*(0.42 + 0.1*Math.sin(t*0.4))*Math.min(1, ent*1.6); ctx.drawImage(heroSeal(fac), x-52, gy-15, 104, 34); ctx.globalAlpha = A0;
    heroShadow(fac, era, x, gy, dir); }
  else projShadow(x, gy, 20);
  if (moving && rich && !float && particles.length<440 && Math.random()<0.16)
    particles.push({ x:u.x-dir*9, y:gy-1, vx:-dir*8+(Math.random()*6-3), vy:-9-Math.random()*9, r:1.8+Math.random()*2, life:0.45+Math.random()*0.3, t:0, color:'rgba(198,184,156,0.5)' });
  const stream = moving? 1 : 0.4;
  const img = (part, px, py, a, ox) => { ctx.save(); if (ox) ctx.translate(ox*S, 0);
    if (a){ ctx.translate(px*S, py*S); ctx.rotate(a); ctx.translate(-px*S, -py*S); }
    ctx.drawImage(heroPart(fac,era,part), -HSP.cx, -HSP.foot, HSP.W, HSP.H); ctx.restore(); };
  const orbit = front => {                                             // éclats de cristal en orbite (aura de la Singularité)
    const n = R.orb[era], sh = heroShard(), sp2 = P.gest? 1.9 : 1;
    for (let i=0;i<n;i++){ const a = t*0.22*sp2 + i*6.283/n, z = Math.sin(a);
      if ((z>0)!==front) continue;
      const k = 0.8 + 0.2*z, ox = Math.cos(a)*(19+era*2.4)*S, oy = (-40 - era*2 + Math.sin(a*2+i)*5 + z*4)*S;
      ctx.drawImage(sh, ox-5*k, oy-8*k, 10*k, 16*k); } };
  const paint = live => {
    if (!hum && live) orbit(false);
    img('back');
    if (hum && era===4 && live){                                       // cape
      const w = Math.sin(t*0.55)*1.4, st = stream; ctx.save(); ctx.scale(S,S);
      ctx.beginPath(); ctx.moveTo(-1,-44.5); ctx.lineTo(-7.5,-46); ctx.lineTo(-13-w-st*3,-30); ctx.lineTo(-17-w*2-st*9,-9+st*5); ctx.lineTo(-6-w-st*4,-8+st*2); ctx.closePath();
      ctx.fillStyle='#a8221e'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7.5,-46); ctx.lineTo(-13-w-st*3,-30); ctx.lineTo(-17-w*2-st*9,-9+st*5); ctx.lineTo(-13-w*1.6-st*7,-9.6+st*4); ctx.lineTo(-10-w-st*2,-30); ctx.closePath();
      ctx.fillStyle='#d23a2c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1,-44.5); ctx.lineTo(-7.5,-46); ctx.lineTo(-13-w-st*3,-30); ctx.lineTo(-17-w*2-st*9,-9+st*5); ctx.lineTo(-6-w-st*4,-8+st*2); ctx.closePath();
      ctx.strokeStyle=HERO_INK; ctx.lineWidth=0.9; ctx.lineJoin='round'; ctx.stroke(); ctx.restore(); }
    img('armb', -3, hum? -42 : -44, P.ab);
    if (hum && live){                                                  // drapeau : il suit la hampe
      ctx.save(); ctx.translate(-3*S,-42*S); ctx.rotate(P.ab); ctx.translate(3*S,42*S); ctx.scale(S,S);
      heroCloth(ctx, R.pole-0.6, R.ptop[era]+2, R.fh[era], R.fl[era], t, stream, unf, '#cf2a26', 'rgba(110,16,16,0.4)', era>=1? '#f2cf62' : null);
      ctx.restore(); }
    ctx.drawImage(heroPart(fac,era,'legs',pose), HLEG.ox, HLEG.oy, HLEG.W, HLEG.H);
    img('body');
    img('arm', hum? 2 : 3, hum? -42 : -44, P.af, P.ax);
    if (!hum && live) orbit(true);
  };
  ctx.save(); ctx.translate(x + dir*lunge, gy + dy); ctx.rotate(dir*tilt); ctx.scale(dir, sy);
  if (clipK<1){ const hh = (R.top[era]+14)*S; ctx.beginPath(); ctx.rect(-HSP.cx, -hh*clipK-2, HSP.W, hh*clipK+12); ctx.clip(); }
  paint(true);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = A0*Math.min(0.36, u.flash*2.4); paint(false); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha = A0; }
  ctx.restore();
  if (clipK<1){ const hh = (R.top[era]+14)*S, yy = gy+dy-hh*clipK;     // trait de matérialisation
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,140,226,0.9)'; ctx.fillRect(x-34, yy-1, 68, 2);
    ctx.fillStyle='rgba(255,140,226,0.25)'; ctx.fillRect(x-40, yy-5, 80, 10); ctx.restore(); }
  heroAttackFX(u, x + dir*lunge, gy + dy, dir, S, P, era);
  // nom de la légende : seulement à l'entrée en scène (4 s), puis il s'efface — plus de panneau permanent
  if (age<4 && A0>0.5){ const a = Math.min(1, age*3)*clamp((4-age)/0.8, 0, 1), col = HERO_COL[fac], ny = gy - heroTop(u) - 30 - (hum? 0 : 4);
    ctx.save(); ctx.globalAlpha = A0*a; ctx.font=HF(11); ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.lineJoin='round';
    ctx.strokeStyle='rgba(12,8,16,0.8)'; ctx.lineWidth=3; ctx.strokeText(HERO_NAME[fac], x, ny); ctx.fillStyle=col; ctx.fillText(HERO_NAME[fac], x, ny); ctx.restore(); }
  // posture du héros du joueur : petit jeton à l'encre au-dessus de lui quand elle n'est pas « normale »
  if (u.side===1 && A0>0.5){ const hs = game.p.heroStance;
    if (hs && hs!=='normal'){ const iy = gy - heroTop(u) - 12; ctx.save(); ctx.globalAlpha = A0*0.92;
      ctx.fillStyle='#efe6cf'; ctx.strokeStyle=HERO_INK; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(x, iy, 7, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = (u.hstate==='flee')? '#b8402e' : '#2a2018'; drawIcon(hs==='prudent'? (u.hstate==='flee'? 'back' : 'shield') : 'swords', x, iy, 10); ctx.restore(); } }
}
// effets de frappe du héros : flamme de bouche + traceur, estafilade, arc de lame, faisceau (traits et bouffées cuites)
function heroAttackFX(u, x, y, dir, S, P, era){
  const hum = u.fac==='HUM', ts = P.ts, R = HERO_RIG[u.fac], h = u._h;
  const pt = (px, py, sx, sy2, a, ox) => { const dx=(px-sx), dy=(py-sy2), c=Math.cos(a), s=Math.sin(a);   // point d'une couche de bras, en px écran
    return [x + dir*((sx + dx*c - dy*s) + (ox||0))*S, y + (sy2 + dx*s + dy*c)*S]; };
  if (!hum && P.wind>0.3 && P.vNext===1 && !P.hit){                    // la paume se charge
    const m = pt(R.palm[0], R.palm[1], -3, -44, P.ab), r = 5+9*P.wind, L = lightSprite('#ff6ad6');
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha *= 0.9; ctx.drawImage(L, m[0]-r, m[1]-r, r*2, r*2); ctx.restore(); }
  if (!P.hit) return;
  const fresh = h.fxN!==u.atkN+'|'+(u.atkT>0.5); if (fresh) h.fxN = u.atkN+'|'+(u.atkT>0.5);
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  if (hum && P.v===0){
    if (ts<0.1){ const k = 1-ts/0.1, mz = R.mz[era], m = pt(mz[0], mz[1], 2, -42, P.af, P.ax), PF = puffSprites(), r = 5+8*k;
      if (qFx()){ ctx.globalAlpha = Math.min(1, 0.4+k); ctx.drawImage(PF.fire, m[0]+dir*3-r, m[1]-r, r*2, r*2); ctx.globalAlpha = 1; }
      ctx.strokeStyle = rgbaC(era>=3? '#ffd9a0' : '#fff1c8', 0.85*k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0]+dir*(54+20*(1-k)), m[1]-1); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(m[0]+dir*4, m[1]-5*k); ctx.lineTo(m[0]+dir*4, m[1]+5*k); ctx.stroke();
      if (fresh){ addLight(u.x+dir*34*S, y-36*S, '#ffd9a0', 34, 0.16);
        if (qFx() && era<3 && particles.length<480) particles.push({k:'d', x:u.x+dir*10*S, y:y-36*S, vx:-dir*(30+Math.random()*30), vy:-80-Math.random()*40, g:520, dr:0.4, life:0.7, t:0, r:1.2, rot:Math.random()*6, vr:(Math.random()-0.5)*30, color:'#d8b050'}); } }
  } else if (hum){
    if (ts<0.16){ const k = 1-ts/0.16, mz = R.mz[era], m = pt(mz[0]+6, mz[1], 2, -42, P.af, P.ax);
      ctx.strokeStyle = rgbaC('#ffffff', 0.7*k); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(m[0]-dir*30, m[1]+1); ctx.lineTo(m[0]+dir*8, m[1]); ctx.stroke();
      ctx.strokeStyle = rgbaC('#ffd9a0', 0.4*k); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(m[0]-dir*18, m[1]+1); ctx.lineTo(m[0]+dir*6, m[1]); ctx.stroke();
      if (fresh) addLight(u.x+dir*40*S, y-36*S, '#ffd9a0', 26, 0.14); }
  } else if (P.v===0){
    if (ts<0.2){ const k = 1-ts/0.2, c = pt(3, -44, 3, -44, 0), r = 36*S, a0 = dir>0? -1.25 : Math.PI+1.25, a1 = dir>0? 0.75 : Math.PI-0.75;
      ctx.strokeStyle = rgbaC('#ffffff', 0.2+0.55*k); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(c[0], c[1], r, a0, a1, dir<0); ctx.stroke();
      ctx.strokeStyle = rgbaC('#ff6ad6', 0.45*k); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c[0], c[1], r-2, a0, a1, dir<0); ctx.stroke();
      if (fresh) addLight(u.x+dir*30*S, y-40*S, '#ff9ae6', 30, 0.16); }
  } else if (ts<0.24){
    const k = 1-ts/0.24, m = pt(R.palm[0], R.palm[1], -3, -44, P.ab), ex = m[0]+dir*(62+10*S), ey = m[1]+4, L = lightSprite('#ff6ad6');
    ctx.strokeStyle = rgbaC('#ff6ad6', 0.4*k); ctx.lineWidth = 7*k+2; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = rgbaC('#ffffff', 0.9*k); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(ex, ey); ctx.stroke();
    const r = 10+10*k; ctx.globalAlpha *= k; ctx.drawImage(L, ex-r, ey-r, r*2, r*2); ctx.drawImage(L, m[0]-r*0.6, m[1]-r*0.6, r*1.2, r*1.2);
    if (fresh) addLight(u.x+dir*60, y-30*S, '#ff6ad6', 40, 0.2);
  }
  ctx.restore();
}
// MORT (1,8 s) : le Che vacille, lâche son fusil et tombe à la renverse pendant que son drapeau s'abat ;
// la Singularité grésille, s'affaisse sur elle-même et s'éteint (le cristal vole en éclats)
function drawHeroDeath(d, x, gy, k){
  const fac = d.fac, hum = fac==='HUM', era = heroEra(d.era), S = HERO_S[fac][era], R = HERO_RIG[fac], dir = d.side;
  const img = (part, px, py, a) => { ctx.save(); if (a){ ctx.translate(px*S, py*S); ctx.rotate(a); ctx.translate(-px*S, -py*S); }
    ctx.drawImage(heroPart(fac,era,part), -HSP.cx, -HSP.foot, HSP.W, HSP.H); ctx.restore(); };
  const fade = clamp((1-k)/0.28, 0, 1);
  ctx.globalAlpha = fade;
  if (hum){
    const k1 = clamp(k/0.3, 0, 1), k2 = hSm(clamp((k-0.26)/0.3, 0, 1));
    // le drapeau reste planté un instant, puis s'abat vers l'avant
    const fa = hSm(clamp((k-0.2)/0.5, 0, 1)); ctx.save(); ctx.translate(x - dir*11*S, gy); ctx.scale(dir, 1); ctx.rotate(fa*fa*1.42);
    ctx.translate(11*S, 0); img('armb'); ctx.scale(S,S);
    heroCloth(ctx, R.pole-0.6, R.ptop[era]+2, R.fh[era], R.fl[era], d.t*7, 0.2*(1-fa), 1, '#cf2a26', 'rgba(110,16,16,0.4)', era>=1? '#f2cf62' : null);
    ctx.restore();
    ctx.save(); ctx.translate(x - dir*(k1*5 + k2*10), gy + k1*3*(1-k2)); ctx.rotate(-dir*(k1*0.2 + k2*1.25)); ctx.scale(dir, 1 - 0.06*k1);
    img('back'); ctx.drawImage(heroPart(fac,era,'legs', k2>0.1? 1 : 0), HLEG.ox, HLEG.oy, HLEG.W, HLEG.H); img('body'); img('arm', 2, -42, 0.3 + k1*1.1);
    ctx.restore();
  } else {
    const k1 = clamp(k/0.38, 0, 1), k2 = hSm(clamp((k-0.34)/0.3, 0, 1));
    const jx = k2<1? (Math.sin(d.t*61)+Math.sin(d.t*37))*2.2*(1-k2) : 0;
    if (qFx() && k<0.7 && particles.length<480 && Math.random()<0.5) particles.push({k:'s', x:d.x+(Math.random()-0.5)*24, y:gy-(20+Math.random()*50)*S*(1-k2*0.5), vx:(Math.random()-0.5)*160, vy:-60-Math.random()*90, g:340, dr:1.6, life:0.3+Math.random()*0.3, t:0, color:'#ff9ae6', r:1.4});
    if (era===4){                                                      // le cristal se fissure puis éclate
      if (k2>0 && !d._sh){ d._sh = 1; burst(d.x, gy-46*S, '#f0d2ff', 22, 1.1); }
      ctx.globalAlpha = fade*(1-k2); ctx.save(); ctx.translate(x+jx, gy-8+k1*8); ctx.scale(dir*(1+k2*0.25), 1+k2*0.25);
      img('back'); img('armb'); ctx.drawImage(heroPart(fac,era,'legs',0), HLEG.ox, HLEG.oy, HLEG.W, HLEG.H); img('body'); img('arm'); ctx.restore();
    } else {
      if ((Math.sin(d.t*47)>0.55) && k<0.4) ctx.globalAlpha = fade*0.55;   // grésillement
      ctx.save(); ctx.translate(x+jx, gy); ctx.scale(dir, 1);
      ctx.drawImage(heroPart(fac,era,'legs', k2>0.3? -1 : 0), HLEG.ox, HLEG.oy + k2*8, HLEG.W, HLEG.H*(1-k2*0.2));
      ctx.translate(-k2*5*S, k2*17*S); ctx.rotate(-k2*0.42 - k1*0.05);
      img('back'); img('armb', -3, -44, k1*0.5 + k2*0.7); img('body'); img('arm', 3, -44, k1*1.0 + k2*0.9); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
