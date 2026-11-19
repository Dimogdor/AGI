/* Textes d'asymétrie, lots 2-3 (généré à partir de la liste de clés ; voir 02b-i18n-asym.js pour le lot 1). */
const I18N_ASYM2 = {
fr:{ f_relief:"🩹 RELEVÉ !",
  f_recycle:"♻ récupéré" },
en:{ f_relief:"🩹 PULLED UP!",
  f_recycle:"♻ salvaged" },
es:{ f_relief:"🩹 ¡LEVANTADO!",
  f_recycle:"♻ recuperado" },
de:{ f_relief:"🩹 AUFGERICHTET!",
  f_recycle:"♻ recycelt" },
it:{ f_relief:"🩹 RIALZATO!",
  f_recycle:"♻ recuperato" },
pt:{ f_relief:"🩹 SOCORRIDO!",
  f_recycle:"♻ reciclado" },
ru:{ f_relief:"🩹 ПОДНЯТ!",
  f_recycle:"♻ переработано" },
zh:{ f_relief:"🩹 救起！",
  f_recycle:"♻ 回收" },
ar:{ f_relief:"🩹 أُنقِذ!",
  f_recycle:"♻ أُعيد تدويره" },
};
for (const L in I18N_ASYM2) Object.assign(I18N[L], I18N_ASYM2[L]);
