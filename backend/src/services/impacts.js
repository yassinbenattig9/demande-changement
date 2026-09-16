'use strict';

const { sql, getPool, insertRow, getColumns, toDtoRows, toDtoFirst } = require('../db');
const { normEmail } = require('./shared');

async function listImpacts(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numero))
    .query(`SELECT * FROM [Service_impactees] WHERE numero_demande = @nd ORDER BY rowid ASC`);
  return toDtoRows('Service_impactees', res.recordset);
}

async function addImpact(numero, impact) {
  const pool = await getPool();
  await insertRow('Service_impactees', {
    numero_demande: String(numero),
    service: impact.service || '',
    email_cancernee: normEmail(impact.email_cancernee || impact.email),
    fonction: impact.fonction || '',
    reponse: impact.reponse || '',
    date_reponse: impact.date_reponse || null,
    commentaire: impact.commentaire || '',
    Intervenant: impact.Intervenant || '',
  });
  return listImpacts(numero).then((r) => r.find((x) => x.email_cancernee === normEmail(impact.email_cancernee || impact.email)) || null);
}

async function updateImpact(numero, service, email, patch) {
  const pool = await getPool();
  const values = {
    reponse: patch.reponse,
    date_reponse: patch.date_reponse || null,
    commentaire: patch.commentaire,
    Intervenant: patch.Intervenant,
    fonction: patch.fonction,
  };
  const cols = await getColumns('Service_impactees');
  const sets = [];
  const req = pool.request();
  let i = 0;
  for (const [key, val] of Object.entries(values)) {
    if (!cols.some((c) => c.name === key) || val === undefined) continue;
    req.input(`s${i}`, sql.NVarChar, val === null ? null : val);
    sets.push(`[${key}] = @s${i}`);
    i += 1;
  }
  req.input('nd', sql.NVarChar, String(numero));
  req.input('sv', sql.NVarChar, service);
  req.input('em', sql.NVarChar, email);
  await req.query(
    `UPDATE [Service_impactees] SET ${sets.join(', ') || '[reponse] = [reponse]'}
      WHERE numero_demande = @nd AND service = @sv AND LOWER(LTRIM(RTRIM(email_cancernee))) = LOWER(LTRIM(RTRIM(@em)))`
  );
  const row = await pool
    .request()
    .input('nd', sql.NVarChar, String(numero))
    .input('sv', sql.NVarChar, service)
    .input('em', sql.NVarChar, email)
    .query(
      `SELECT * FROM [Service_impactees]
        WHERE numero_demande = @nd AND service = @sv AND LOWER(LTRIM(RTRIM(email_cancernee))) = LOWER(LTRIM(RTRIM(@em)))`
    );
  return toDtoFirst('Service_impactees', row.recordset);
}

module.exports = { listImpacts, addImpact, updateImpact };