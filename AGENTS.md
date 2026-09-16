# Agents Guide — Change Control Medicis

## Project Paths

| Asset | Path |
|---|---|
| **Project root** | `C:\Users\yassine.atig\Desktop\Node React projects\demande changement` |
| **Frontend** | `…/demande changement/frontend` (Vite + React + TypeScript) |
| **Backend** | `…/demande changement/backend` (Express + mssql + express-session) |
| **Legacy ASP.NET repo** | `C:\Users\yassine.atig\Desktop\Projets ahmed\change_control -Medicis\version finale` |
| **Stale French copy** | DELETED (was `…\Node React projets\…`) |

## Quick Start

### Backend

```bash
cd "C:\Users\yassine.atig\Desktop\Node React projects\demande changement\backend"
npm install          # install once
npm start            # runs: node src/index.js (port 4000)
```

### Frontend

```bash
cd "C:\Users\yassine.atig\Desktop\Node React projects\demande changement\frontend"
npm install          # install once
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # production build → dist/
```

## Test Database

| Key | Value |
|---|---|
| Server | `197.13.22.67\SRVAPPINT` |
| Database | `DCMEDICIS_TEST` (test copy; never modify DCMEDICIS production) |
| Credentials | Stored in `backend/.env` (gitignored; never paste into chat) |
| Schema | Fixed; no migrations allowed |

## Test Login

| Email | Password | Notes |
|---|---|---|
| `hajer.abid@medicis.tn` | `Hajer123**` | Plaintext in test DB; sessions managed via express-session (8 h maxAge) |

## Code Style & Conventions

- **No comments** in code unless the user explicitly asks for them.
- **TypeScript strict-ish** — `tsc --noEmit` must pass before any commit or build.
- **Build must pass** — run `npm run build` in frontend and verify no errors.
- **No secrets in code** — all credentials live in `backend/.env` (gitignored).

## Architecture Summary

```
Frontend (Vite)
  └─ api-client.ts  (re-exports httpApi; no mock layer)
       └─ api-http.ts  (fetch with credentials:include → backend)

Backend (Express)
  ├─ index.js        (express-session, CORS, morgan; port 4000)
  ├─ routes.js       (router.use auth gate on ALL data routes)
  ├─ workflow.js     (GxP workflow state machine)
  ├─ workflow-admin.js (workflow config/version admin + RBAC)
  └─ services/       (domain modules: auth, users, demandes, sujets, approbations,
                      impacts, plans, reunions, diffusions, mailing, history,
                      notifications, referentiels, system, stats + index barrel)
  └─ scripts/        (smoke-workflow.js, hash-passwords.js, migrate-access.js)
```

## Common Gotchas

1. **Dashboard stats route is `/stats/dashboard`** — not `/dashboard/stats`.
2. **Ghost-view FS flakiness** — edits sometimes don't land. Always verify with a `Read` after `Edit`.
3. **Start node servers with absolute paths** and use `workdir` param to ensure CWD is correct.
4. **Kill stray node processes** before re-testing backend:
   ```powershell
   Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%src\\index.js%'" |
     ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
   ```
5. **Smoke tests pollute the DB** — clean up test `historique` rows by `numero_chronologique` first, then `Demande` rows.
6. **Session auth is cookie-based** — all fetch calls must use `credentials: 'include'`; logout clears the session cookie server-side.

## Key Files Reference

| File | Purpose |
|---|---|
| `frontend/src/lib/api-client.ts` | Single export: `apiClient` (http only, no mock dispatcher) |
| `frontend/src/lib/api-http.ts` | All HTTP fetch calls with `credentials: 'include'` |
| `frontend/src/lib/contract.ts` | `MedicisApiClientContract` interface + `DashboardStats` type |
| `frontend/src/context/AuthContext.tsx` | Session restore on mount, ANONYMOUS placeholder, no mock imports |
| `frontend/src/App.tsx` | React.lazy() code-split routes |
| `backend/src/routes.js` | Auth gate, validation helpers, all API routes |
| `backend/src/services/` | Domain modules barrel (auth, users, demandes, …) |
| `postman/Medicis-Change-Control.postman_collection.json` | 78-request Postman collection (session cookie auto) |
| `TEST_CASES.md` | 78 cas de test avec colonne O/N à remplir |
