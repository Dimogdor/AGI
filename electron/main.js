/* Electron — fenêtre desktop (Windows / macOS / Linux).
   Charge le bundle web obfusqué de www/. Le menu et les DevTools sont
   désactivés en production pour limiter l'inspection du code. */
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const INDEX = path.join(__dirname, '..', 'www', 'index.html');
const INDEX_URL = pathToFileURL(INDEX).href;
// seules permissions utiles au jeu : plein écran et copie du code de salon (presse-papiers)
const ALLOWED_PERMS = new Set(['fullscreen', 'clipboard-sanitized-write']);

const DEV = !!process.env.AGI_DEV;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 854, minHeight: 480,
    backgroundColor: '#0d0a0a', autoHideMenuBar: true, fullscreenable: true,
    title: "AGI — La Dernière Bataille de l'Humanité",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,           // explicite (défaut récent, mais on ne s'y fie pas)
      devTools: DEV,           // pas de DevTools en prod
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (!DEV) Menu.setApplicationMenu(null);
  // SÉCURITÉ : la fenêtre ne quitte JAMAIS le jeu local. Nouvelles fenêtres refusées ; seuls les
  // liens mailto: (avis / rapport de bug) et https: partent vers le système, jamais dans l'appli.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.split(/[?#]/)[0] === INDEX_URL) return;      // rechargement du jeu lui-même, rien d'autre
    e.preventDefault();
    if (/^mailto:/i.test(url)) shell.openExternal(url);
  });
  win.loadFile(INDEX);
}

app.whenReady().then(() => {
  // aucune permission sensible (caméra, micro, position, notifications…) : refusées d'office
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ALLOWED_PERMS.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ALLOWED_PERMS.has(perm));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
