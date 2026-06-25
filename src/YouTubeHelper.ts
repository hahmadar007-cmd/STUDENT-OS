// src/YouTubeHelper.ts
/**
 * YouTubeHelper – a thin wrapper around the Google YouTube Data API v3.
 * It takes an encrypted refresh token (stored by the main process), decrypts it,
 * automatically refreshes the access token when expired, and exposes convenient
 * methods such as fetching the authenticated user's top playlists.
 *
 * Designed for Node.js (Electron main process) – no UI code, pure logic.
 */
import { google } from 'googleapis';
import fetch from 'node-fetch'; // fallback if you prefer raw fetch
import * as path from 'path';
import * as fs from 'fs';
import { app, safeStorage } from 'electron';

// ==== Configuration – keep in sync with main.ts ====
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '<YOUR_CLIENT_ID>'; // same as in main.ts
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '<YOUR_CLIENT_SECRET>'; // same as in main.ts
const REDIRECT_URI = 'studentos://oauth-callback';

// Path where the encrypted refresh token is stored (must match main.ts)
const TOKEN_FILE = path.join(app.getPath('userData'), 'yt_refresh_token.enc');

/** Load and decrypt the stored refresh token */
function loadRefreshToken(): string | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  const hex = fs.readFileSync(TOKEN_FILE, { encoding: 'utf8' });
  const encrypted = Buffer.from(hex, 'hex');
  try {
    return safeStorage.decryptString(encrypted);
  } catch (e) {
    console.error('Failed to decrypt refresh token:', e);
    return null;
  }
}

/** Simple token holder that knows when the access token expires */
interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expiry_date: number; // epoch ms
}

/** YouTubeHelper class */
export class YouTubeHelper {
  private oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  private tokenInfo: TokenInfo | null = null;

  constructor() {
    const refresh = loadRefreshToken();
    if (refresh) {
      // Initialise client with only refresh token – access token will be fetched lazily.
      this.oauth2Client.setCredentials({ refresh_token: refresh });
    }
  }

  /** Ensure we have a valid access token, refreshing if necessary */
  private async ensureAccessToken(): Promise<string> {
    // If we have a tokenInfo with a future expiry, reuse it.
    if (this.tokenInfo && this.tokenInfo.expiry_date > Date.now() + 60_000) {
      return this.tokenInfo.access_token;
    }
    // Otherwise, request a fresh access token using the refresh token.
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('Unable to obtain access token');
    }
    // Save tokenInfo for quick future checks.
    this.tokenInfo = {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token!,
      expiry_date: credentials.expiry_date || Date.now() + (credentials.expires_in ?? 3600) * 1000,
    };
    return this.tokenInfo.access_token;
  }

  /** Fetch the authenticated user's channel ID – needed for many YouTube calls */
  private async getChannelId(): Promise<string> {
    const access = await this.ensureAccessToken();
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
      headers: { Authorization: `Bearer ${access}` },
    });
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error('No channel found');
    return data.items[0].id;
  }

  /** Fetch the top N playlists of the authenticated user (ordered by viewCount) */
  async getTopPlaylists(limit = 5): Promise<any[]> {
    const access = await this.ensureAccessToken();
    const channelId = await this.getChannelId();
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      channelId,
      maxResults: String(limit),
      order: 'viewCount',
    });
    const url = `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Failed to fetch playlists: ${response.status} ${txt}`);
    }
    const data = await response.json();
    return data.items || [];
  }
}

/** Convenience export for the renderer via IPC (optional) */
export const youtubeHelper = new YouTubeHelper();
