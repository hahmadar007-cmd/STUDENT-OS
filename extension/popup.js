const BACKEND_URL = 'https://ammeeee-student-os.hf.space';

const loginSection  = document.getElementById('loginSection');
const mainSection   = document.getElementById('mainSection');
const statusBadge   = document.getElementById('statusBadge');
const statusDot     = document.getElementById('statusDot');
const statusText    = document.getElementById('statusText');
const loginError    = document.getElementById('loginError');
const blocklistEl   = document.getElementById('blocklistItems');

let domains = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(status) {
  statusBadge.className = `status-badge ${status.toLowerCase()}`;
  statusDot.className   = `dot ${status.toLowerCase()}`;
  const labels = { IDLE: 'Idle – No active session', FOCUSING: '🔒 Focus Mode Active', ON_BREAK: '☕ Break Time!' };
  statusText.textContent = labels[status] || status;
}

function renderBlocklist() {
  if (domains.length === 0) {
    blocklistEl.innerHTML = '<div class="empty">No blocked sites yet</div>';
    return;
  }
  blocklistEl.innerHTML = domains
    .map(d => `<div class="blocklist-item">
      <span class="domain">${d.label || d.value}</span>
      <button class="remove" data-id="${d.id}" data-value="${d.value}">×</button>
    </div>`)
    .join('');

  blocklistEl.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => removeDomain(btn.dataset.id, btn.dataset.value));
  });
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const { token } = await chrome.storage.local.get('token');
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email    = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  loginError.style.display = 'none';

  try {
    const res  = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    // Store token and send to background
    await chrome.storage.local.set({ token: data.access_token });
    chrome.runtime.sendMessage({ type: 'SET_TOKEN', token: data.access_token });

    showMain();
    await loadBlocklist();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.style.display = 'block';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'focusStatus', 'blockedDomains']);
  chrome.runtime.sendMessage({ type: 'SET_TOKEN', token: null });
  showLogin();
});

// ─── Blocklist ────────────────────────────────────────────────────────────────

async function loadBlocklist() {
  try {
    const res  = await apiFetch('/focus/blocklist');
    const data = await res.json();
    domains = data.filter(d => d.type === 'DOMAIN');
    // Sync to background
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKLIST',
      domains: domains.map(d => d.value),
    });
    await chrome.storage.local.set({ blockedDomains: domains.map(d => d.value) });
    renderBlocklist();
  } catch {
    blocklistEl.innerHTML = '<div class="empty">Could not load blocklist</div>';
  }
}

document.getElementById('addDomainBtn').addEventListener('click', async () => {
  const input = document.getElementById('newDomain');
  const value = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!value) return;

  try {
    const res = await apiFetch('/focus/blocklist', {
      method: 'POST',
      body: JSON.stringify({ type: 'DOMAIN', value, label: value }),
    });
    if (!res.ok) throw new Error();
    input.value = '';
    await loadBlocklist();
  } catch {
    // silently ignore duplicate
  }
});

async function removeDomain(id, value) {
  try {
    await apiFetch(`/focus/blocklist/${id}`, { method: 'DELETE' });
    await loadBlocklist();
  } catch {
    domains = domains.filter(d => d.id !== id);
    renderBlocklist();
  }
}

// ─── View switching ───────────────────────────────────────────────────────────

function showMain() {
  loginSection.style.display  = 'none';
  mainSection.style.display   = 'block';
}

function showLogin() {
  loginSection.style.display  = 'flex';
  mainSection.style.display   = 'none';
  document.getElementById('loginSection').style.flexDirection = 'column';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const { token } = await chrome.storage.local.get('token');

  if (token) {
    showMain();
    await loadBlocklist();
  }

  // Get live status from background
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
    if (resp) setStatus(resp.focusStatus || 'IDLE');
  });
})();
