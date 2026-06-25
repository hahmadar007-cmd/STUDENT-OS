// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Validate channel names to prevent abuse
const VALID_IPC = {
  login: 'youtube-login',
  getRefresh: 'youtube-get-refresh-token',
};

contextBridge.exposeInMainWorld('youtubeAPI', {
  /** Trigger the OAuth login flow */
  login: async () => {
    await ipcRenderer.invoke(VALID_IPC.login);
  },
  /** Retrieve the decrypted refresh token (null if not logged in) */
  getRefreshToken: async () => {
    return await ipcRenderer.invoke(VALID_IPC.getRefresh);
  },
  /** Subscribe to auth‑success events */
  onAuthSuccess: (callback) => {
    ipcRenderer.on('youtube-auth-success', () => callback());
  },
});
