/**
 * Fasca Focus Blocker – Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  1. Connect to the Fasca backend WebSocket (/focus namespace) using the
 *     user's stored JWT token.
 *  2. Maintain live session state (FOCUSING | ON_BREAK | IDLE).
 *  3. Intercept webNavigation events and redirect blocked domains to
 *     blocked.html when the user is in FOCUSING state.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://ammeeee-student-os.hf.space';
const BLOCKED_PAGE = chrome.runtime.getURL('blocked.html');

// ─── State ────────────────────────────────────────────────────────────────────
let focusStatus = 'IDLE'; // 'IDLE' | 'FOCUSING' | 'ON_BREAK'
let blockedDomains = [];  // string[] – normalised domain list
let socket = null;
let reconnectTimer = null;

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadState() {
  const data = await chrome.storage.local.get(['focusStatus', 'blockedDomains', 'token']);
  focusStatus = data.focusStatus ?? 'IDLE';
  blockedDomains = data.blockedDomains ?? [];
  return data.token ?? null;
}

async function saveState() {
  await chrome.storage.local.set({ focusStatus, blockedDomains });
}

// ─── Domain matching ──────────────────────────────────────────────────────────

function normaliseDomain(raw) {
  try {
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function isBlocked(url) {
  if (focusStatus !== 'FOCUSING') return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return blockedDomains.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

async function connectSocket(token) {
  if (!token) return;

  // Dynamically import socket.io-client from a local bundled copy
  // (We bundle socket.io-client at extension/lib/socket.io.min.js)
  const { io } = await import(chrome.runtime.getURL('lib/socket.io.esm.min.js'));

  if (socket) socket.disconnect();

  socket = io(`${BACKEND_URL}/focus`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    console.log('[Fasca] Connected to focus gateway');
    clearTimeout(reconnectTimer);
  });

  socket.on('focusStarted', async (data) => {
    console.log('[Fasca] Focus started', data);
    focusStatus = 'FOCUSING';
    // Refresh blocklist from storage (user may have updated it)
    const stored = await chrome.storage.local.get('blockedDomains');
    blockedDomains = stored.blockedDomains ?? [];
    await saveState();
    chrome.action.setBadgeText({ text: '🔒' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  });

  socket.on('breakStarted', async (data) => {
    console.log('[Fasca] Break started', data);
    focusStatus = 'ON_BREAK';
    await saveState();
    chrome.action.setBadgeText({ text: '☕' });
    chrome.action.setBadgeBackgroundColor({ color: '#059669' });
    // Set an alarm to remind user break is ending soon
    const breakSecs = Math.floor((data.breakDurationMs - 60000) / 1000);
    if (breakSecs > 0) {
      chrome.alarms.create('breakEndingSoon', { delayInMinutes: breakSecs / 60 });
    }
  });

  socket.on('focusResumed', async () => {
    console.log('[Fasca] Focus resumed');
    focusStatus = 'FOCUSING';
    await saveState();
    chrome.action.setBadgeText({ text: '🔒' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  });

  socket.on('focusEnded', async () => {
    console.log('[Fasca] Focus ended');
    focusStatus = 'IDLE';
    await saveState();
    chrome.action.setBadgeText({ text: '' });
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Fasca Focus Complete 🎉',
      message: 'Your focus session is over. Great work!',
    });
  });

  socket.on('disconnect', () => {
    console.log('[Fasca] Disconnected from focus gateway');
  });
}

// ─── Navigation Interceptor ───────────────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // top-level frames only
  if (details.url.startsWith(chrome.runtime.getURL(''))) return; // skip extension pages

  if (isBlocked(details.url)) {
    const encoded = encodeURIComponent(details.url);
    const redirectUrl = `${BLOCKED_PAGE}?url=${encoded}&status=${focusStatus}`;
    chrome.tabs.update(details.tabId, { url: redirectUrl });
  }
});

// ─── Alarm ────────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'breakEndingSoon') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Fasca – Break Ending Soon ⚡',
      message: 'Your break ends in 1 minute. Get ready to focus!',
    });
  }
});

// ─── Message handling from popup ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_STATUS') {
    sendResponse({ focusStatus, blockedDomains });
  }

  if (msg.type === 'UPDATE_BLOCKLIST') {
    blockedDomains = msg.domains;
    chrome.storage.local.set({ blockedDomains });
    sendResponse({ ok: true });
  }

  if (msg.type === 'SET_TOKEN') {
    chrome.storage.local.set({ token: msg.token });
    connectSocket(msg.token);
    sendResponse({ ok: true });
  }

  return true; // keep channel open for async
});

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const token = await loadState();
  if (token) await connectSocket(token);
})();
