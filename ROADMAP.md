# Medicis Change Control — Improvement Roadmap

> **Status legend:** `[ ]` = pending, `[~]` = in progress, `[x]` = done

---

## Phase 1 — Critical Bugs (Must fix before http mode is usable)

Blockers. Without these, the app cannot authenticate users or display data reliably.

| # | Issue | Status |
|---|---|---|
| 1.1 | **`getUserByEmail` always returns `null`** — backend returns single object, frontend expects array. Fix api-http.ts or backend route. | [x] |
| 1.2 | **`RequestsListPage` infinite spinner on API error** — `getDemandes().then(...)` has no `.catch()`. Add error handling. | [x] |
| 1.3 | **`RecherchePage` infinite spinner on API error** — same pattern as 1.2. Add `.catch()` with error toast. | [x] |
| 1.4 | **`NotificationsDropdown` unguarded API calls** — `getNotifications` and `markNotificationRead` have no try/catch. | [x] |
| 1.5 | **`NewChangeRequestPage` unguarded Promise.all** — parallel request batch at line 119 has no `.catch()`. | [x] |
| 1.6 | **`UserAdminPage` duplicate-email check uses mock** — `getUserByEmail` imported from `mock/data`, not `apiClient`. | [x] |
| 1.7 | **`RequestDetailPage` attachments hardcoded** — `MOCK_ATTACHMENTS` imported from `mock/data`, never calls `getPiecesJointes()`. | [x] |

---

## Phase 2 — Session-Based Authentication

Secure login with express-session + cookies. The backend stores bcrypt passwords; the frontend needs proper session management.

| # | Task | Status |
|---|---|---|
| 2.1 | Install `express-session` | [x] |
| 2.2 | Configure session middleware in `index.js` (secret, cookie settings, 8h maxAge) | [x] |
| 2.3 | Add `POST /auth/login` session creation — set `req.session.user` on success | [x] |
| 2.4 | Add `POST /auth/logout` — `req.session.destroy()` | [x] |
| 2.5 | Add `GET /auth/me` — return session user or 401 | [x] |
| 2.6 | Add `requireAuth` middleware on all data routes (after auth section) | [x] |
| 2.7 | Update api-http.ts — add `credentials: 'include'`, `logout()`, `getCurrentUser()` | [x] |
| 2.8 | Update api-mock.ts contract — add `logout()`, `getCurrentUser()` | [x] |
| 2.9 | Update AuthContext.tsx — restore session on mount via `getCurrentUser()`, call `logout()` on sign-out | [x] |
| 2.10 | CORS configured — `credentials: true`, origins `localhost:5173/5174` | [x] |
| 2.11 | Live HTTP auth flow test — 9/9 passed (login session, me, logout, 401 after logout) | [x] |

---

## Phase 3 — Robustness & Data Integrity

Makes the app production-quality.

| # | Task | Status |
|---|---|---|
| 3.1 | **Fix `délaiMoyenJours`** — avg planned lead time (édition → MEP souhaitée), real calc | [x] |
| 3.2 | **Fix `evolutionMensuelle` sort** — sort by `YYYYMM` (was lexicographic on `MM/YYYY`) | [x] |
| 3.3 | **Add CORS config** — `origin: 'http://localhost:5173'`, `credentials: true` | [x] |
| 3.4 | **Add input validation** — required fields on createDemande, createReunion, submitApproval | [x] |
| 3.5 | **Remove orphan routes** — `PUT /demandes/:id/incomplet`, `PUT /demandes/:id/approbations` (base) | [x] |
| 3.6 | **Remove dead contract methods** — `updateDemande`, `removeSujet`, `getPendingApprovals`, `deletePlanAction`, `getMailingsByDemande`, `getUserById`, `deleteUser`, `getUnreadCount` | [x] |
| 3.7 | **Normalize `cloturer` column** — map `'en cours'` → `false`, `'clôturée'` → `true` | [x] |
| 3.8 | **Add request logging** — Morgan middleware for HTTP logs | [x] |
| 3.9 | **Fix `getUserByEmail` route shape** — backend returns single object, wrap in `{user}` or array | [x] |
| 3.10 | **Phase 3 smoke test** — 15/15 passed (validation, orphan 404s, real délai, chronological sort) | [x] |

---

## Phase 4 — Cleanup & Polish

Housekeeping.

| # | Task | Status |
|---|---|---|
| 4.1 | **Delete stale `Node React projets` (French) copy** — duplicate src files | [x] |
| 4.2 | **Update AGENTS.md** — document correct path, start commands, test DB config | [x] |
| 4.3 | **Add `.env.local` to `.gitignore`** — prevent committing VITE_API_MODE | [x] |
| 4.4 | **Code-split the build** — `React.lazy()` on heavy pages (Dashboard, RequestsList, Historique) | [x] |
| 4.5 | **Verify `getPiecesJointes` implementation** — check legacy `PDF/` folder for file storage | [x] |

---

## Phase 5 — Feature Suggestions

Nice-to-have enhancements after core app works.

| # | Feature | Description |
|---|---|---|
| 5.1 | **PDF generation** | Generate demand recap PDFs (legacy has `PDF_TEST.aspx`). Use `pdfkit` or `puppeteer` |
| 5.2 | **Email notifications** | Send real emails via SMTP when approvals are pending. Use `nodemailer` |
| 5.3 | **Gantt chart for plan actions** | Visual timeline of plan actions across demandes |
| 5.4 | **Bulk import/export** | Import demandes from Excel, export audit trails to CSV |
| 5.5 | **Advanced search with filters** | Multi-criteria search (date range, service, status, keyword) with saved presets |
| 5.6 | **Dashboard KPIs** | SLA compliance, average resolution time, demand volume trends, service-wise breakdown |
| 5.7 | **Role-based access control** | Restrict page visibility by role (DirecteurAQ, RespChang, etc.) |
| 5.8 | **Dark mode toggle** | ThemeContext exists but isn't wired to UI |
| 5.9 | **Multi-language support** | French/English toggle |
| 5.10 | **Audit trail export** | Download full historique for a demande as PDF/CSV |
| 5.11 | **Real-time notifications** | WebSocket or SSE for live notification updates |
| 5.12 | **Batch approval** | Approve/reject multiple approbations at once |

---

*Last updated: 2026-09-14*
