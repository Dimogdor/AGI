/* ════════════════════════════════════════════════════════════════════════════
   Proxy TURN — Cloudflare Worker
   ────────────────────────────────────────────────────────────────────────────
   But : garder le token Cloudflare SECRET côté serveur. Le jeu appelle ce
   Worker, qui contacte l'API Cloudflare et ne renvoie que des identifiants
   TURN temporaires (valables 24 h, inoffensifs). Le token ne quitte jamais
   le serveur et n'apparaît donc plus dans la page.

   DÉPLOIEMENT (dashboard Cloudflare, gratuit) :
   1. Workers & Pages → Create → Workers → "Create Worker".
   2. Colle TOUT ce fichier dans l'éditeur, puis "Deploy".
   3. Onglet Settings → Variables and Secrets → ajoute 2 SECRETS :
        TURN_KEY_ID  = <ton Key ID Cloudflare>
        TURN_TOKEN   = <ton API token Cloudflare>
      (type « Secret », pas « Text » : ils restent cachés.)
   4. Re-déploie. Note l'URL du Worker (ex. https://turn-xxx.workers.dev).
   5. Donne-moi cette URL : je branche le jeu dessus et je retire le token
      de la page. Pense ensuite à RÉGÉNÉRER ta TURN Key (l'ancien token a
      déjà été exposé, donc on le rend mort).

   Astuce sécurité : adapte ALLOWED_ORIGINS à ton/tes domaine(s) pour que
   seul ton jeu puisse utiliser ce proxy.
   ════════════════════════════════════════════════════════════════════════════ */

const ALLOWED_ORIGINS = [
  "https://dimogdor.github.io",   // GitHub Pages du jeu
  // APPLI MOBILE : Capacitor sert le jeu depuis une origine locale, PAS depuis GitHub Pages.
  // Sans ces deux lignes, le relais renvoie 403 dans l'APK et le 1v1 retombe en silence sur le
  // TURN public OpenRelay — peu fiable entre deux téléphones en 4G, où un relais est souvent
  // indispensable. (La vérification d'Origin ne bloque que les autres SITES web ; elle n'a
  // jamais été une barrière contre un client hors navigateur, qui peut forger cet en-tête.)
  "https://localhost",            // Android (capacitor.config.json : androidScheme "https")
  "capacitor://localhost",        // iOS
  // "https://ton-domaine-perso.fr",  // ajoute ici un domaine custom si besoin
];

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Pré-vol CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    // On n'autorise que les origines de la liste blanche
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders(origin) });
    }

    const api = "https://rtc.live.cloudflare.com/v1/turn/keys/"
      + encodeURIComponent(env.TURN_KEY_ID) + "/credentials/generate-ice-servers";

    const upstream = await fetch(api, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.TURN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 86400 }),
    });

    const body = await upstream.text();   // contient SEULEMENT username/credential temporaires
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  },
};
