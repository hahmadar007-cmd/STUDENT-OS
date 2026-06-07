# Security Audit Report — STUDENT-OS

**Date:** 2026-06-07  
**Auditor:** Devin (automated scan)

---

## CRITICAL — Fixed in this PR

### 1. Hardcoded Database Credentials in `render.yaml`
**File:** `render.yaml:10-12`  
**Severity:** CRITICAL  
The Supabase PostgreSQL connection string (including username and password `tL3%40QEov1122`) is committed to the repo in plain text. Anyone with repo access can read/write/delete the entire database.

**Fix:** Replace with environment variable references.

### 2. Hardcoded JWT Secret Fallback in 3 Modules + `crypto.ts`
**Files:** `backend/src/auth/auth.module.ts:11`, `backend/src/groups/groups.module.ts:12`, `backend/src/app.module.ts:20`, `backend/src/utils/crypto.ts:4`  
**Severity:** CRITICAL  
The JWT secret fallback `fasca-obsidian-secret-key-1337` is hardcoded. If `JWT_SECRET` env var is unset, any attacker can forge valid JWTs. The `crypto.ts` has a slightly different variant (`...-change-in-prod`) making encryption inconsistent across modules.

**Fix:** Fail fast at startup if `JWT_SECRET` is not set, remove all hardcoded fallbacks. Unify the crypto module to use the same env var.

### 3. Overly Permissive CORS — Allows All Origins
**Files:** `backend/src/main.ts:8`, `backend/src/groups/groups.gateway.ts:14`  
**Severity:** HIGH  
`app.enableCors()` with no arguments and `@WebSocketGateway({ cors: true })` allow requests from **any origin**, enabling cross-site request forgery and credential theft.

**Fix:** Restrict CORS to the actual frontend origin via `CORS_ORIGIN` env var.

### 4. Exposed Debug Endpoint — `GET /test/db`
**File:** `backend/src/app.controller.ts:32-36`  
**Severity:** HIGH  
An unauthenticated endpoint that returns the user count from the database. In production this leaks database metadata and confirms the stack.

**Fix:** Remove the endpoint.

### 5. Missing Authentication on `GET /groups/:groupId/messages`
**File:** `backend/src/groups/groups.controller.ts:29-31`  
**Severity:** HIGH  
Anyone can fetch all messages in any group without a token. Every other groups endpoint requires auth.

**Fix:** Add JWT token verification.

### 6. Missing Authentication on `POST /ai/chat` and `POST /ai/index-document`
**File:** `backend/src/ai/ai.controller.ts:15-30, 32-61`  
**Severity:** HIGH  
Both AI endpoints accept requests without verifying a JWT token. An unauthenticated user can consume AI API quota, index documents, and read course materials.

**Fix:** Add JWT-based auth guard.

### 7. Gemini API Key Leaked in URL Query Parameters
**File:** `backend/src/ai/ai.service.ts:119`, `backend/src/ai/vector.service.ts:47`  
**Severity:** MEDIUM  
API keys are passed as `?key=...` query parameters in Gemini API calls. These appear in server logs, proxy logs, and HTTP referer headers. This is the Google Gemini API's standard mechanism, so this is noted but not changed.

---

## MEDIUM — Noted (not changed in this PR)

### 8. WebSocket Auth Bypass / Fallback to First DB User
**File:** `backend/src/groups/groups.gateway.ts:77-96`  
If JWT verification fails in `sendMessage`, the code falls back to using the **first user in the database** as the sender. This means an unauthenticated socket can send messages as another user.

### 9. Arbitrary Shell Command Execution via `taskkill`
**File:** `backend/src/app.service.ts:83-104`  
The server runs `taskkill /F /IM "..."` with a hardcoded list of apps. While the app names are hardcoded (not user-supplied), running OS-level process killing from a web server is a dangerous pattern and a privilege escalation risk.

### 10. SSRF Risk in LMS Integration
**Files:** `backend/src/lms/lms.service.ts`, `backend/src/app.controller.ts:354-400`  
Users supply arbitrary `baseUrl` values for Moodle/Canvas endpoints. The server then makes HTTP requests to those URLs with user-supplied tokens, enabling Server-Side Request Forgery (SSRF) against internal networks.

### 11. Token Stored in localStorage (XSS risk)
**File:** `frontend/lib/api.ts:18`  
JWT tokens stored in `localStorage` are accessible to any JavaScript on the page, making them vulnerable to XSS attacks. The code also sets a cookie, which is better, but the localStorage path remains.

---

## LOW — Informational

### 12. No Rate Limiting on Auth Endpoints
Login and registration endpoints have no rate limiting, enabling brute-force attacks.

### 13. `password` Field is Optional in Schema
**File:** `backend/prisma/schema.prisma:24`  
The `password` field is `String?` (optional), meaning users can exist without passwords.

### 14. Cookie Not Set as `HttpOnly`
**File:** `frontend/lib/api.ts:21`  
The auth token cookie is not `HttpOnly`, so it can be read by client-side JavaScript (same XSS concern as localStorage).
