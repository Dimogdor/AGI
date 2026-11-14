// Empreinte d'une réplique : FNV-1a 32 bits de « langue|qui|texte » (UTF-8), 8 chiffres hexadécimaux.
// MÊME algorithme que voiceHash()/voiceKey() dans src/16c0-voice.js (vérifié par tools/test-voice.mjs).
export function voiceHash(s){
  const b = new TextEncoder().encode(String(s)); let h = 0x811c9dc5;
  for (let i=0;i<b.length;i++){ h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000'+h.toString(16)).slice(-8);
}
export const voiceKey = (lang, who, text) => voiceHash(lang+'|'+who+'|'+text);
