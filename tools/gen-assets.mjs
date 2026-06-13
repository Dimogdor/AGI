/* tools/gen-assets.mjs — génère icônes et visuels de store depuis un SVG maître.
   Lancer : node tools/gen-assets.mjs   (nécessite `sharp`)
   Produit dans resources/ : icon.svg + PNG (icône, feature graphic, splash). */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const R = new URL('../resources/', import.meta.url);
await mkdir(R, { recursive: true });

const FONT = 'FreeSans, DejaVu Sans, sans-serif';

// --- icône maître (carré plein, sans transparence : compatible iOS + Play + maskable) ---
const icon = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#241a16"/><stop offset="55%" stop-color="#120d0c"/><stop offset="100%" stop-color="#0a0707"/>
    </radialGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f2ead9"/><stop offset="100%" stop-color="#d8cdb8"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- scanlines discrètes -->
  <g opacity="0.06" fill="#9ad1d4">${Array.from({length:32},(_,i)=>`<rect x="0" y="${i*32}" width="1024" height="2"/>`).join('')}</g>
  <!-- omega OMNICORP en filigrane -->
  <text x="512" y="660" font-family="${FONT}" font-size="620" font-weight="bold" fill="#a8281e" opacity="0.10" text-anchor="middle">&#937;</text>
  <!-- cadre -->
  <rect x="40" y="40" width="944" height="944" rx="150" fill="none" stroke="#a8281e" stroke-opacity="0.35" stroke-width="8"/>
  <!-- AGI : ombre rouge décalée + lettres claires -->
  <text x="528" y="600" font-family="${FONT}" font-size="370" font-weight="bold" fill="#a8281e" text-anchor="middle" letter-spacing="-6">AGI</text>
  <text x="512" y="584" font-family="${FONT}" font-size="370" font-weight="bold" fill="url(#ink)" text-anchor="middle" letter-spacing="-6">AGI</text>
  <!-- filet + accroche -->
  <rect x="312" y="676" width="400" height="6" fill="#a8281e"/>
  <text x="512" y="752" font-family="${FONT}" font-size="58" font-weight="bold" fill="#b89a7a" text-anchor="middle" letter-spacing="8">GUERRE DES ÈRES</text>
</svg>`;

await writeFile(new URL('icon.svg', R), icon(1024));
for (const s of [1024, 512, 192]) {
  await sharp(Buffer.from(icon(s))).png().flatten({ background: '#0d0a0a' }).toFile(new URL(`icon-${s}.png`, R).pathname);
}
// iOS exige 1024 carré sans alpha — identique à icon-1024 (déjà aplati)

// --- feature graphic Google Play : 1024×500, sans alpha ---
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  <defs><radialGradient id="g" cx="30%" cy="40%" r="90%">
    <stop offset="0%" stop-color="#2a1c16"/><stop offset="60%" stop-color="#120d0c"/><stop offset="100%" stop-color="#0a0707"/>
  </radialGradient></defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <g opacity="0.05" fill="#9ad1d4">${Array.from({length:16},(_,i)=>`<rect x="0" y="${i*32}" width="1024" height="2"/>`).join('')}</g>
  <text x="64" y="232" font-family="${FONT}" font-size="180" font-weight="bold" fill="#a8281e">AGI</text>
  <text x="58" y="226" font-family="${FONT}" font-size="180" font-weight="bold" fill="#f2ead9">AGI</text>
  <text x="64" y="300" font-family="${FONT}" font-size="40" font-weight="bold" fill="#b89a7a" letter-spacing="6">GUERRE DES ÈRES</text>
  <text x="64" y="372" font-family="${FONT}" font-size="34" fill="#c4bcb0">Le capital contre l'humanité — stratégie temps réel.</text>
  <text x="64" y="418" font-family="${FONT}" font-size="34" fill="#c4bcb0">Évoluez à travers les ères. Survivez à un monde qui s'effondre.</text>
  <text x="760" y="300" font-family="${FONT}" font-size="300" font-weight="bold" fill="#a8281e" opacity="0.12" text-anchor="middle">&#937;</text>
</svg>`;
await sharp(Buffer.from(feature)).png().flatten({ background: '#0d0a0a' }).toFile(new URL('feature-graphic.png', R).pathname);

// --- splash 2732×2732 (Capacitor) ---
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="#0d0a0a"/>
  <text x="1372" y="1380" font-family="${FONT}" font-size="520" font-weight="bold" fill="#a8281e" text-anchor="middle">AGI</text>
  <text x="1366" y="1360" font-family="${FONT}" font-size="520" font-weight="bold" fill="#f2ead9" text-anchor="middle">AGI</text>
  <text x="1366" y="1520" font-family="${FONT}" font-size="84" font-weight="bold" fill="#b89a7a" text-anchor="middle" letter-spacing="12">GUERRE DES ÈRES</text>
</svg>`;
await sharp(Buffer.from(splash)).png().flatten({ background: '#0d0a0a' }).toFile(new URL('splash.png', R).pathname);

console.log('✔ resources/ : icon.svg, icon-{1024,512,192}.png, feature-graphic.png, splash.png');
