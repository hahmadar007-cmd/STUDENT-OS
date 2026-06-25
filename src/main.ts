// src/main.ts
import { app, BrowserWindow, protocol, ipcMain, shell, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch'; // npm i node-fetch@2 (CommonJS)

// ---- Configuration ----
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '<YOUR_CLIENT_ID>'; // Replace with your Google OAuth client ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '<YOUR_CLIENT_SECRET>'; // Replace with your client secret
const REDIRECT_URI = 'studentos://oauth-callback';
const OAUTH_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

// Path to store encrypted refresh token
const TOKEN_FILE = path.join(app.getPath('userData'), 'yt_refresh_token.enc');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => (mainWindow = null));
}

/** Generate Google OAuth URL for desktop flow */
function generateOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: OAUTH_SCOPES.join(' '),
    access_type: 'offline', // request refresh token
    prompt: 'consent', // always get refresh token
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchange authorization code for tokens */
async function exchangeCodeForTokens(code: string) {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) throw new Error('Failed to exchange code for tokens');
  return response.json(); // { access_token, refresh_token, expires_in, ... }
}

/** Securely store refresh token */
function storeRefreshToken(refreshToken: string) {
  const encrypted = safeStorage.encryptString(refreshToken);
  fs.writeFileSync(TOKEN_FILE, encrypted.toString('hex'));
}

/** Load and decrypt refresh token */
function loadRefreshToken(): string | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  const hex = fs.readFileSync(TOKEN_FILE, { encoding: 'utf8' });
  const encrypted = Buffer.from(hex, 'hex');
  return safeStorage.decryptString(encrypted);
}

/** Notify renderer that auth succeeded */
function notifyAuthSuccess() {
  if (mainWindow) {
    mainWindow.webContents.send('youtube-auth-success');
  }
}

/** Handle deep‑link URL (studentos://oauth-callback?code=…) */
async function handleOAuthCallback(urlStr: string) {
  try {
    const parsed = new URL(urlStr);
    const code = parsed.searchParams.get('code');
    if (!code) throw new Error('No code in callback URL');
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) throw new Error('Refresh token missing');
    storeRefreshToken(tokens.refresh_token);
    // Optionally store access token/expiry if you want immediate use.
    notifyAuthSuccess();
  } catch (err) {
    console.error('OAuth callback handling failed:', err);
  }
}

/** Single‑instance lock handling */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    // Windows: deep link URL will be in argv.
    const deepLink = argv.find((arg) => arg.startsWith('studentos://'));
    if (deepLink) {
      handleOAuthCallback(deepLink);
    }
    // Focus primary window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // Register custom protocol (so OS knows about it). Only needed once per app.
  if (!app.isDefaultProtocolClient('studentos')) {
    // On Windows you may need to pass the executable path.
    app.setAsDefaultProtocolClient('studentos');
  }

  createWindow();

  // Primary instance may receive the deep link directly (e.g., on first launch).
  const deepLink = process.argv.find((arg) => arg.startsWith('studentos://'));
  if (deepLink) handleOAuthCallback(deepLink);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/** IPC – renderer triggers login */
ipcMain.handle('youtube-login', async () => {
  const authUrl = generateOAuthUrl();
  shell.openExternal(authUrl);
  // No immediate result; the renderer will be notified via 'youtube-auth-success' later.
});

/** IPC – renderer can request the stored refresh token (decrypted) */
ipcMain.handle('youtube-get-refresh-token', async () => {
  const token = loadRefreshToken();
  return token; // May be null if not logged in.
});
