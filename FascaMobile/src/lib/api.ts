/**
 * Fasca Mobile – API Client
 * All calls go to the same NestJS backend powering the web dashboard.
 */

const BACKEND = 'https://ammeeee-student-os.hf.space';

import { getToken } from './storage';

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<string> {
  const res  = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data.access_token;
}

// ─── Blocklist ────────────────────────────────────────────────────────────────

export async function getBlocklist() {
  const res = await fetch(`${BACKEND}/focus/blocklist`, { headers: await authHeaders() });
  return res.json();
}

export async function addToBlocklist(type: 'DOMAIN' | 'APP', value: string, label?: string) {
  const res = await fetch(`${BACKEND}/focus/blocklist`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ type, value, label }),
  });
  return res.json();
}

export async function removeFromBlocklist(id: string) {
  await fetch(`${BACKEND}/focus/blocklist/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getActiveSession() {
  const res = await fetch(`${BACKEND}/focus/session/active`, { headers: await authHeaders() });
  const data = await res.json();
  if (!data?.id) return null;
  return data;
}

export async function startSession(config: {
  totalDurationMs: number;
  numberOfBreaks: number;
  breakDurationMs: number;
  strictMode: boolean;
}) {
  const res = await fetch(`${BACKEND}/focus/session/start`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function abortSession() {
  await fetch(`${BACKEND}/focus/session/abort`, {
    method: 'POST',
    headers: await authHeaders(),
  });
}
