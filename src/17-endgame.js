/* ================= FIN DE PARTIE ================= */
function showEnd(){
  const et = document.getElementById('endtitle'), s = document.getElementById('endstats');
  et.textContent = game.win? t('end_win') : t('end_lose');
  et.style.color = game.win? '#e8d8a0' : '#a8281e';
  const mins = Math.floor(game.t/60), secs = ('0'+Math.floor(game.t%60)).slice(-2);
  s.innerHTML =
    t('end_duration')+' : '+mins+' min '+secs+' s<br>'+
    t('end_kills')+' : '+game.kills+' · '+t('end_losses')+' : '+game.eKills+'<br>'+
    t('end_era')+' : '+lEra(game.p.facKey,game.p.era)+(game.p.trans? ' — '+lTransName(game.p.facKey):'')+'<br>'+
    t('end_powers')+' : '+game.specialsUsed+' · '+t('end_world')+' : '+Math.round((1-game.dev)*100)+'%'+
    '<br><br><i style="color:#bcae93">'+warJournal()+'</i>';
  document.getElementById('endscreen').style.display = 'flex';
}
// JOURNAL DE GUERRE : 2-3 lignes générées à partir de l'issue de la partie (récit localisé).
function warJournal(){
  const o = { era:lEra(game.p.facKey,game.p.era), kills:game.kills, losses:game.eKills,
              world:Math.round((1-game.dev)*100), fac:game.p.fac.name, foe:game.e.fac.name,
              brigade:73 + (Math.floor(game.t)%27) };
  return fmt(game.win? 'journal_win' : 'journal_lose', o);
}
