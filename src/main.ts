import { join } from 'node:path';

import { app, components, globalShortcut, ipcMain, session, BrowserWindow } from 'electron';

let ascendon: string | null = null;
let loginWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

const createLoginWindow = () => {
  if (ascendon || !mainWindow)
    return;

  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    parent: mainWindow,
    modal: true,
  });

  loginWindow.on('closed', () => {
    if (!ascendon)
      console.warn('F1TV:Login | Login window closed without login!');

    loginWindow = null;
  });

  loginWindow.loadURL('https://account.formula1.com/#/en/login');

  if (!app.isPackaged)
    loginWindow.webContents.openDevTools();
};

const createMainWindow = () => {
  if (mainWindow)
    return;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, MAIN_WINDOW_VITE_NAME, 'preload.js'),
      webSecurity: true,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    session.defaultSession.cookies
      .get({ url: 'https://f1tv.formula1.com', name: 'login-session' })
      .then((cookies) => {
        if (cookies.length > 0) {
          const loginSession = JSON.parse(decodeURIComponent(cookies[0].value));

          if (ascendon !== loginSession.data.subscriptionToken)
            ascendon = loginSession.data.subscriptionToken;
        }

        if (mainWindow)
          mainWindow.webContents.send('main_window:ready-to-show', ascendon);
      });
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, MAIN_WINDOW_VITE_NAME, `index.html`));
  }

  if (!app.isPackaged)
    mainWindow.webContents.openDevTools();
};

const onReady = async () => {
  // register toggle devtools shortcut
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (focusedWindow)
      focusedWindow.webContents.toggleDevTools();
  });

  // fix player Widevine requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.startsWith('https://f1tv.formula1.com/') && details.url.indexOf('/widevine') !== -1 && details.requestHeaders.Referer)
      delete details.requestHeaders.Referer;

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // intercept cookies and update the ascendon token
  session.defaultSession.cookies.on('changed', (e, cookie, cause, removed) => {
    if (cookie.name === 'login-session' && cookie.domain === '.formula1.com') {
      if (removed && (cause === 'explicit' || cause === 'expired')) {
        ascendon = null;
      } else {
        const loginSession = JSON.parse(decodeURIComponent(cookie.value));

        if (loginSession.data.subscriptionToken === ascendon)
          return;

        ascendon = loginSession.data.subscriptionToken;

        if (loginWindow)
          loginWindow.close();
      }
    }
  });

  // initialize Widevine
  await components.whenReady();

  // create main window
  createMainWindow();
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0)
    onReady();
});

ipcMain.handle('f1tv:login', async () => {
  createLoginWindow();
});

ipcMain.handle('f1tv:logout', async () => {
  if (!ascendon)
    return;

  await session.defaultSession.cookies.remove('https://f1tv.formula1.com', 'login-session');
  ascendon = null;
});

app
  .whenReady()
  .then(onReady);
