/* tools/test-lint.mjs — analyse statique du jeu construit (ESLint, règle no-undef).
   Attrape les variables non déclarées, comme le `p` de buildOptions (v1.19) : une ReferenceError
   pendant le rendu vidait le menu d'un bâtiment abîmé (ni réparer, ni améliorer) sans qu'aucun
   test ne passe par cet état. Prérequis : npm run dev.  Lancer : node tools/test-lint.mjs */
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import globals from 'globals';

const html = readFileSync(new URL('../la-derniere-bataille.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = scripts.join('\n;\n');
const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [{
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
    rules: { 'no-undef': 'error' },
  }],
});
const [res] = await eslint.lintText(code, { filePath: 'game.js' });
// faux positifs connus : accès gardés par `typeof X !== 'undefined'`
const lines = code.split('\n');
const real = res.messages.filter(m => !/typeof\s+\w+\s*!==?\s*'undefined'/.test(lines[m.line-1] || ''));
console.log('\nANALYSE STATIQUE (variables non déclarées)');
if (real.length){
  for (const m of real) console.log(`  ✗ ligne ${m.line}:${m.column} ${m.message} — ${(lines[m.line-1]||'').trim().slice(0,120)}`);
  console.log(`\n✗ ${real.length} problème(s)`); process.exit(1);
}
console.log(`  ✓ aucune variable non déclarée (${scripts.length} script(s), ${(code.length/1024|0)} Ko)`);
console.log('\n✓ analyse statique : tout passe');
