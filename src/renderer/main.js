// src/renderer/main.js
// This file runs in the renderer process (browser context) and uses the safe API exposed by preload.

/** Update UI status text */
function setStatus(message, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff6b6b' : '#8cf5c2';
}

// Handle button click
document.getElementById('connectBtn').addEventListener('click', async () => {
  try {
    setStatus('Opening Google login…');
    await window.youtubeAPI.login();
    setStatus('Waiting for authentication…');
  } catch (err) {
    console.error(err);
    setStatus('Failed to start login flow.', true);
  }
});

// Listen for successful auth event from main process
window.youtubeAPI.onAuthSuccess(() => {
  setStatus('✅ YouTube connected!');
  // Optionally fetch user data here via helper utility (via IPC or direct call).
});
