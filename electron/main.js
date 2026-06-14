/* Electron — fenêtre desktop (Windows / macOS / Linux).
   Charge le bundle web obfusqué de www/. Le menu et les DevTools sont
   désactivés en production pour limiter l'inspection du code. */
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const DEV = !!process.env.AGI_DEV;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 854, minHeight: 480,
    backgroundColor: '#0d0a0a', autoHideMenuBar: true, fullscreenable: true,
    title: 'AGI — Guerre des Ères',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: DEV,           // pas de DevTools en prod
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (!DEV) Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
