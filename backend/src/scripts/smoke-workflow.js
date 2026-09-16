/**
 * Smoke test du moteur de workflow (Phase B) — HTTP + base.
 *
 * Usage : 1) démarrer le serveur (node src/index.js)  2) node src/scripts/smoke-workflow.js
 * Objectif : vérifier bout en bout la file d'approbation parallèle et les
 * transitions d'étapes (validation 4 approbateurs → PRT → refus).
 */

'use strict';

require('dotenv').config();
const http = require('http');
const { getPool, sql } = require('../db');

const BASE = `http://localhost:${process.env.PORT || 4000}`;
const EMAIL_TEST = process.env.SMOKE_EMAIL || 'hajer.abid@medicis.tn';
const PASSWORD_TEST = process.env.SMOKE_PASSWORD || 'Hajer123**';

let cookie = '';
const results = [];

function assert(name, cond, extra) {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}${extra ? ' — ' + extra : ''}`);
}

function request(method, path, body, expectJson = true) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const payload = body === undefined ? null : JSON.stringify(body);
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(BASE + path, { method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'];
        if (setCookies && setCookies.length) {
          const sc = setCookies[0].split(';')[0];
          cookie = sc; // connect.sid=...
        }
        let parsed = null;
        try {
          parsed = expectJson && data ? JSON.parse(data) : null;
        } catch {
          /* texte */
        }
        resolve({ status: res.statusCode, json: parsed, text: data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function dbEmailsByPerm() {
  const pool = await getPool();
  const res = await pool.request().query(
    `SELECT p.code, u.email
       FROM [Permissions] p
       JOIN [Role_Permissions] rp ON rp.id_perm = p.id_perm
       JOIN [Utilisateur_Roles] ur  ON ur.id_role = rp.id_role
       JOIN [Utilisateurs] u ON u.rowid = ur.id_user
      WHERE p.code IN ('approbation.responsable_service','approbation.charge_changement',
                       'approbation.responsable_changement','approbation.directeur_qualite',
                       'approbation.prt')
      ORDER BY p.code, u.email`
  );
  const map = {};
  for (const r of res.recordset) {
    if (!map[r.code]) map[r.code] = r.email;
  }
  return map;
}

async function demandeWorkflow(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.Int, numero)
    .query(`SELECT etape_courante, statut_decision FROM [Demande_Workflow] WHERE id_demande = @nd`);
  return res.recordset[0] || null;
}

async function etatDemande(numero) {
  const pool = await getPool();
  const res = await pool.request().input('nd', sql.Int, numero).query(`SELECT etat_demande FROM [Demande] WHERE numero_demande = @nd`);
  return res.recordset[0] ? res.recordset[0].etat_demande : null;
}

async function cleanup(numero, chrono) {
  const pool = await getPool();
  const tables = [
    ['Approbation', 'numero_demande'],
    ['Service_impactees', 'numero_demande'],
    ['Diffusions', 'Num_Dem'],
    ['mailing', 'numero_demande'],
  ];
  for (const [t, c] of tables) {
    try {
      await pool.request().input('nd', sql.NVarChar, String(numero)).query(`DELETE FROM [${t}] WHERE ${c} = @nd`);
    } catch (_) {
      /* ignore */
    }
  }
  try {
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Sujet_Demande] WHERE numero_demande = @nd`);
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Plan_actions] WHERE numero_demande = @nd`);
  } catch (_) {
    /* ignore */
  }
  try {
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Demande_Workflow] WHERE id_demande = @nd`);
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Demande] WHERE numero_demande = @nd`);
  } catch (_) {
    /* ignore */
  }
  try {
    if (chrono) {
      await pool.request().input('c', sql.NVarChar, String(chrono)).query(`DELETE FROM [historique] WHERE numero_chronologique = @c`);
    }
  } catch (_) {
    /* ignore */
  }
  await pool.close();
}

/** Soumet une décision pour chaque paire (type, email) en attente de la demande. */
async function decideAllPending(numero, decision, commentaire) {
  const pending = await request('GET', '/api/approbations/en-attente');
  const mine = (pending.json || []).filter((p) => p.approbation?.numero_demande === numero);
  const seen = new Set();
  let count = 0;
  for (const p of mine) {
    const type = p.approbation.type_approbation;
    const email = p.approbation.email_approbant;
    const key = `${type}|${email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = await request('PUT', `/api/demandes/${numero}/approbations/${encodeURIComponent(type)}`, {
      email_approbant: email,
      decision,
      commentaire: commentaire || 'Décision smoke',
    });
    if (!(r.status === 200 && r.json?.success)) {
      throw new Error(`Échec décision ${key} (status=${r.status}, body=${r.text})`);
    }
    count += 1;
  }
  return count;
}

async function main() {
  console.log(`\n⚙  Smoke workflow — ${new Date().toISOString()}`);

  // 1. Ping
  const ping = await request('GET', '/api/ping');
  assert('ping /api/ping → pong', ping.status === 200 && ping.json?.message === 'pong', `status=${ping.status}`);

  // 2. Non authentifié → 401
  const unauth = await request('GET', '/api/demandes');
  assert('GET /api/demandes sans session → 401', unauth.status === 401, `status=${unauth.status}`);

  // 3. Login
  const login = await request('POST', '/api/auth/login', { email: EMAIL_TEST, password: PASSWORD_TEST });
  assert(
    'login hajer → success + user',
    login.status === 200 && login.json?.success === true && !!login.json?.user?.email,
    `email=${login.json?.user?.email}`
  );
  assert('login expose permissions', Array.isArray(login.json?.permissions) && login.json.permissions.length >= 0);

  // 4. /auth/me
  const me = await request('GET', '/api/auth/me');
  assert('GET /auth/me → user', me.status === 200 && me.json?.user?.email === EMAIL_TEST.toLowerCase());
  assert('/auth/me ne renvoie pas le hash', !me.json?.user?.password || !me.json.user.password.startsWith('$2'));

  // 5. Liste des demandes
  const list = await request('GET', '/api/demandes');
  assert('GET /demandes → array', list.status === 200 && Array.isArray(list.json));

  // 6. Workflow courant (publication active)
  const wf = await request('GET', '/api/workflow/current');
  const etapeValidation = wf.json?.etapes?.find((e) => e.code === 'etape_validation');
  assert(
    'GET /workflow/current → version publiée 6 étapes',
    wf.status === 200 && Array.isArray(wf.json?.etapes) && wf.json.etapes.length >= 6 && wf.json.statut === 'publiee',
    `#étapes=${wf.json?.etapes?.length}`
  );
  assert(
    'etape_validation = 4 approbateurs en parallèle',
    etapeValidation && etapeValidation.approbateurs?.length === 4 && etapeValidation.mode === 'parallele',
    `approbateurs=${etapeValidation?.approbateurs?.length}`
  );

  // 7. Création d'une demande → workflow seedé
  const created = await request('POST', '/api/demandes', {
    demandeur: EMAIL_TEST,
    sujet_changement: 'SMOKE workflow auto ' + Date.now(),
    designation: 'SMOKE-PRODUIT',
    service_demandeur: 'Test QA',
    date_souhaite_mep_changement: '31/12/2026',
    site: 'SS',
    type_changement: 'Autres',
    description_changement: 'Demande générée par smoke-workflow.js',
  });
  const numero = created.json?.numero_demande;
  const chrono = created.json?.numero_chronologique;
  assert('POST /demandes → créée + numéro chronologique', created.status === 201 && numero > 0 && /^\d{2}\/\d{3}$/.test(chrono || ''), `#${numero}/${chrono}`);

  const dw0 = await demandeWorkflow(numero);
  assert('seed workflow : etape_courante=etape_validation', dw0 && dw0.etape_courante === 'etape_validation', JSON.stringify(dw0));

  // Emails approbateurs réels (résolution RBAC)
  const byPerm = await dbEmailsByPerm();
  const emails = {
    responsable_service: byPerm['approbation.responsable_service'],
    charge_changement: byPerm['approbation.charge_changement'],
    responsable_changement: byPerm['approbation.responsable_changement'],
    directeur_qualite: byPerm['approbation.directeur_qualite'],
    prt: byPerm['approbation.prt'],
  };
  assert('approbateurs résolus (5 permissions)', Object.values(emails).every(Boolean), JSON.stringify(emails));

  // 8. File d'approbation : contient notre demande
  const pending1 = await request('GET', '/api/approbations/en-attente');
  const mine1 = (pending1.json || []).filter((p) => p.approbation?.numero_demande === numero);
  assert('file d’approbation → notre demande présente', mine1.length > 0, `entrées=${mine1.length}`);

  // Décide TOUTES les paires (type, email) en attente pour notre demande —
  // exactement ce que fait ApprovalQueuePage (tous les emails éligibles décident).
  const decidedValidation = await decideAllPending(numero, 'valide', 'Validation smoke');
  assert(`toutes décisions validation soumises (${decidedValidation})`, decidedValidation >= 1, `nb=${decidedValidation}`);

  const dwMid = await demandeWorkflow(numero);
  assert(
    'tous les emails validés → avancement vers le comité PRT',
    dwMid.etape_courante === 'etape_validation_prt',
    `etape=${dwMid.etape_courante}`
  );

  // Étape suivante : le comité PRT (nouvelle file d'approbation).
  const prt = await decideAllPending(numero, 'valide', 'Validation PRT smoke');
  assert(`décisions PRT soumises (${prt})`, prt >= 1, `nb=${prt}`);

  const dwFull = await demandeWorkflow(numero);
  const etatFull = await etatDemande(numero);
  assert(
    'PRT validé → avancement vers etape_impact',
    dwFull.etape_courante === 'etape_impact',
    `etape=${dwFull.etape_courante}`
  );
  assert(
    'etat legacy = Demande de changement Impact défini',
    String(etatFull || '').trim() === 'Demande de changement Impact défini',
    `etat=${etatFull}`
  );

  // 9b. Garde anti-doublon : re-décider une paire (type, email) déjà décidée → 409
  const replay = await request('PUT', `/api/demandes/${numero}/approbations/${encodeURIComponent('acceptation_responsable_service')}`, {
    email_approbant: emails.responsable_service,
    decision: 'valide',
    commentaire: 'Re-décision (anti-spam)',
  });
  assert(
    're-décision même type+email → 409 déjà décidé',
    replay.status === 409 && /déjà donné sa décision/.test(replay.text),
    `status=${replay.status}`
  );

  // 10. Phase B — test incomplet (séparé, 2e demande)
  const b = await request('POST', '/api/demandes', {
    demandeur: EMAIL_TEST,
    sujet_changement: 'SMOKE incomplet ' + Date.now(),
    designation: 'SMOKE-INCOMPLET',
    service_demandeur: 'Test QA',
    date_souhaite_mep_changement: '31/12/2026',
    site: 'SS',
    type_changement: 'Autres',
    description_changement: 'Test du chemin incomplet',
  });
  const numeroB = b.json?.numero_demande;
  assert('2e POST /demandes → créée', b.status === 201 && numeroB > 0, `#${numeroB}`);

  const imp = await request('PUT', `/api/demandes/${numeroB}/approbations/acceptation_responsable_service`, {
    email_approbant: EMAIL_TEST,
    decision: '',
    commentaire: 'Incomplet smoke',
    markIncomplete: true,
  });
  assert(
    'markIncomplete → success=false + message contient incomplète',
    imp.status === 200 && imp.json?.success === false && String(imp.json?.message || '').includes('incomplète'),
    `msg=${imp.json?.message}`
  );
  const dwB = await demandeWorkflow(numeroB);
  const etatB = await etatDemande(numeroB);
  assert(
    'after markIncomplete → etape_incomplete + etat incomplète',
    dwB.etape_courante === 'etape_incomplete' && String(etatB || '').includes('incomplète'),
    `etape=${dwB.etape_courante}, etat=${etatB}`
  );

  // 11. Contrôle d'accès (RBAC négatif : hajer n'a ni parametrages ni admin.utilisateurs)
  const adminWorkflow = await request('GET', '/api/admin/workflow');
  assert('GET /admin/workflow sans permission → 403', adminWorkflow.status === 403, `status=${adminWorkflow.status}`);
  const adminRoles = await request('GET', '/api/admin/roles');
  assert('GET /admin/roles sans permission → 403', adminRoles.status === 403, `status=${adminRoles.status}`);

  // 12. Route inconnue → 404
  const nf = await request('GET', '/api/does-not-exist');
  assert('route inconnue → 404', nf.status === 404);

  // 13. Logout
  const logout = await request('POST', '/api/auth/logout');
  assert('POST /auth/logout → success', logout.status === 200 && logout.json?.success === true);

  // Résumé
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n══════════════════════════════════`);
  console.log(`${ok}/${total} assertions OK${total - ok ? ` — ${total - ok} ECHEC` : ''}`);
  console.log(`══════════════════════════════════`);
  await cleanup(numero, chrono);
  console.log(`Nettoyage de la demande #${numero} (${chrono}) effectué.`);
  if (numeroB > 0) {
    await cleanup(numeroB, '');
    console.log(`Nettoyage de la demande #${numeroB} effectué.`);
  }

  process.exit(ok === total ? 0 : 1);
}

main().catch((e) => {
  console.error('ÉCHEC smoke :', e);
  process.exit(1);
});