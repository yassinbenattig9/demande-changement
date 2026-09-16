'use strict';
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const { getPool, sql } = require('../db');

const BASE = `http://localhost:${process.env.PORT || 4000}`;
let cookie = '';

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
        const sc = res.headers['set-cookie'];
        if (Array.isArray(sc) && sc.length) cookie = sc[0].split(';')[0];
        let parsed = null;
        try { parsed = expectJson && data ? JSON.parse(data) : null; } catch {}
        resolve({ status: res.statusCode, json: parsed, text: data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function poolQuery(query) {
  const pool = await getPool();
  const r = await pool.request().query(query);
  await pool.close();
  return r.recordset;
}

async function main() {
  // Login en tant qu'admin (détient les 4 permissions d'approbation + PRT).
  const login = await request('POST', '/api/auth/login', { email: 'amenallah.jabloun@teriak.com', password: 'Amen123**' });
  if (login.status !== 200) throw new Error('login admin échoué');

  // Créer une demande.
  const created = await request('POST', '/api/demandes', {
    demandeur: 'amenallah.jabloun@teriak.com',
    sujet_changement: 'VERIFY B11 ' + Date.now(),
    designation: 'VALIDATE-B11',
    service_demandeur: 'Test QA',
    date_souhaite_mep_changement: '31/12/2026',
    site: 'SS',
    type_changement: 'Autres',
    description_changement: 'Vérification B11 : une signature ne doit pas faire disparaître les 3 autres rôles.',
  });
  const numero = created.json?.numero_demande;
  if (!numero) throw new Error('création échouée');

  // File initiale pour nos 4 types.
  const pending0 = await request('GET', '/api/approbations/en-attente');
  const mine = (pending0.json || []).filter((p) => p.approbation?.numero_demande === numero);
  const types = [...new Set(mine.map((p) => p.approbation.type_approbation))];
  console.log('Demande #' + numero + ' → types en attente:', JSON.stringify(types));

  // Signer SEULEMENT le premier type.
  const first = mine[0];
  const r1 = await request('PUT', `/api/demandes/${numero}/approbations/${encodeURIComponent(first.approbation.type_approbation)}`, {
    email_approbant: first.approbation.email_approbant,
    decision: 'valide',
    commentaire: 'B11 verify - 1 seule signature',
  });
  console.log('Signature type=' + first.approbation.type_approbation + ' → status=' + r1.status + ' msg=' + r1.json?.message);

  // Après 1 signature : les 3 AUTRES types doivent rester en attente.
  const pending1 = await request('GET', '/api/approbations/en-attente');
  const mine1 = (pending1.json || []).filter((p) => p.approbation?.numero_demande === numero);
  const typesAfter = [...new Set(mine1.map((p) => p.approbation.type_approbation))];
  console.log('Types restants après 1 signature :', JSON.stringify(typesAfter));

  const dw = await poolQuery(`SELECT etape_courante FROM [Demande_Workflow] WHERE id_demande = ${numero}`);
  console.log('etape_courante :', dw[0]?.etape_courante);

  const remaining = types.length - typesAfter.length;
  const ok = remaining === 1 && dw[0]?.etape_courante === 'etape_validation';
  console.log(ok ? '✅ B11 OK : 1 seule signature → 1 rôle résolu, 3 autres toujours en attente, pas de dispartition' : '❌ B11 KO');

  // Nettoyage
  const pool = await getPool();
  for (const [t, c] of [['Approbation','numero_demande'],['Service_impactees','numero_demande'],['Diffusions','Num_Dem'],['mailing','numero_demande']]) {
    try { await pool.request().input('nd', sql.NVarChar, String(numero)).query(`DELETE FROM [${t}] WHERE ${c} = @nd`); } catch (_) {}
  }
  try {
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Sujet_Demande] WHERE numero_demande = @nd`);
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Plan_actions] WHERE numero_demande = @nd`);
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Demande_Workflow] WHERE id_demande = @nd`);
    await pool.request().input('nd', sql.Int, numero).query(`DELETE FROM [Demande] WHERE numero_demande = @nd`);
  } catch (_) {}
  await pool.close();

  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('ÉCHEC :', e); process.exit(1); });