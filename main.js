'use strict';
// My Little Artist - proceso principal (Electron)
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, clipboard, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
const ICON = path.join(__dirname, 'build', 'icon.png');
let win = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function send(action) {
  if (win && !win.isDestroyed()) win.webContents.send('menu-action', action);
}

function buildMenu() {
  const tpl = [];
  if (isMac) {
    tpl.push({
      label: 'My Little Artist',
      submenu: [
        { role: 'about', label: 'Acerca de My Little Artist' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar' },
        { role: 'hideOthers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de My Little Artist' }
      ]
    });
  }
  tpl.push({
    label: 'Archivo',
    submenu: [
      { label: 'Nuevo dibujo', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
      { label: 'Abrir imagen…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
      { label: 'Guardar en mi galería', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
      { label: 'Exportar imagen (PNG/JPG)…', accelerator: 'CmdOrCtrl+E', click: () => send('export') },
      { label: 'Imprimir…', accelerator: 'CmdOrCtrl+P', click: () => send('print') },
      { type: 'separator' },
      isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }
    ]
  });
  tpl.push({
    label: 'Edición',
    submenu: [
      { label: 'Deshacer', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
      { label: 'Rehacer', accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y', click: () => send('redo') },
      { type: 'separator' },
      { label: 'Cortar', accelerator: 'CmdOrCtrl+X', click: () => send('cut') },
      { label: 'Copiar', accelerator: 'CmdOrCtrl+C', click: () => send('copy') },
      { label: 'Pegar', accelerator: 'CmdOrCtrl+V', click: () => send('paste') },
      { label: 'Seleccionar todo', accelerator: 'CmdOrCtrl+A', click: () => send('selectall') }
    ]
  });
  tpl.push({
    label: 'Ver',
    submenu: [
      { label: 'Acercar', accelerator: 'CmdOrCtrl+=', click: () => send('zoomin') },
      { label: 'Alejar', accelerator: 'CmdOrCtrl+-', click: () => send('zoomout') },
      { label: 'Ajustar a la ventana', accelerator: 'CmdOrCtrl+0', click: () => send('zoomfit') },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Pantalla completa' }
    ]
  });
  tpl.push({
    label: 'Ayuda',
    submenu: [{ label: 'Cómo usar My Little Artist', accelerator: 'F1', click: () => send('help') }]
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

function createWindow() {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1440, wa.width),
    height: Math.min(920, wa.height),
    minWidth: 980,
    minHeight: 640,
    title: 'My Little Artist',
    backgroundColor: '#FFF7E6',
    icon: ICON,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // La app es 100% local: no abre ventanas ni navega fuera.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => { win = null; });
}

// ---------- IPC ----------
function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Imagen inválida');
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

ipcMain.handle('save-image', async (_e, { dataUrl, format, name }) => {
  try {
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const safe = String(name || 'mi-dibujo').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'mi-dibujo';
    let startDir;
    try { startDir = app.getPath('pictures'); } catch (_) { startDir = app.getPath('documents'); }
    const res = await dialog.showSaveDialog(win, {
      title: 'Guardar mi dibujo',
      defaultPath: path.join(startDir, `${safe}.${ext}`),
      filters: [ext === 'jpg' ? { name: 'JPG', extensions: ['jpg', 'jpeg'] } : { name: 'PNG', extensions: ['png'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    let file = res.filePath;
    if (!/\.(png|jpe?g)$/i.test(file)) file += '.' + ext;
    const { buf } = dataUrlToBuffer(dataUrl);
    fs.writeFileSync(file, buf);
    return { ok: true, path: file };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle('open-image', async () => {
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Abrir imagen',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }]
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const file = res.filePaths[0];
    const stat = fs.statSync(file);
    if (stat.size > 60 * 1024 * 1024) return { ok: false, error: 'La imagen es demasiado grande.' };
    const ext = path.extname(file).slice(1).toLowerCase();
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' }[ext] || 'image/png';
    const data = fs.readFileSync(file).toString('base64');
    return { ok: true, dataUrl: `data:${mime};base64,${data}`, name: path.basename(file, path.extname(file)) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle('print-image', async (_e, { dataUrl }) => {
  return new Promise((resolve) => {
    let pw = null;
    try {
      pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        @page{margin:10mm} html,body{margin:0;height:100%} body{display:flex;align-items:center;justify-content:center}
        img{max-width:100%;max-height:100vh;object-fit:contain}</style></head><body><img src="${dataUrl}"></body></html>`;
      pw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      pw.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          pw.webContents.print({ printBackground: true }, (success, reason) => {
            if (pw && !pw.isDestroyed()) pw.close();
            resolve({ ok: success, error: success ? undefined : reason });
          });
        }, 300);
      });
    } catch (err) {
      if (pw && !pw.isDestroyed()) pw.close();
      resolve({ ok: false, error: String(err && err.message || err) });
    }
  });
});

ipcMain.handle('clipboard-read-image', () => {
  const img = clipboard.readImage();
  if (!img || img.isEmpty()) return null;
  return img.toDataURL();
});

ipcMain.handle('clipboard-write-image', (_e, dataUrl) => {
  try {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
    return true;
  } catch (_) { return false; }
});

ipcMain.handle('reveal', (_e, p) => { if (p) shell.showItemInFolder(p); return true; });
ipcMain.handle('app-info', () => ({ version: app.getVersion(), platform: process.platform }));

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (!isMac) app.quit(); });
