import { chromium } from 'playwright-core';
const SP = process.argv[2], mis = +(process.argv[3]||0);
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1280,height:640} });
const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
await p.addInitScript(()=>{ try{ localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1'); localStorage.setItem('agi_settings', JSON.stringify({quality:'high',lang:'fr',music:false,sfx:false})); }catch(e){} });
await p.goto('file:///home/user/AGI/la-derniere-bataille.html'); await p.waitForTimeout(800);
await p.evaluate((i)=>{ localStorage.setItem('agi_introSeen','1'); CAMP_SAVE.done=5; campLaunch(i); }, mis);
const shots = (process.argv[4]||'').split('|').filter(Boolean);
let n=0;
for (const s of shots){ const k = s.indexOf(':'), cmd = k<0? s : s.slice(0,k), arg = k<0? '' : s.slice(k+1);
  if (cmd==='w') await p.waitForTimeout(+arg);
  else if (cmd==='n') await p.evaluate(()=>{ CINE.t=99; cineNext(); });
  else if (cmd==='skip') await p.evaluate(()=>cineEnd());
  else if (cmd==='js') await p.evaluate(arg);
  else if (cmd==='s') await p.screenshot({ path: SP+'/'+arg+'.png' });
}
console.log('errors:', errs.slice(0,8)); await b.close();
