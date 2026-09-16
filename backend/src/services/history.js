'use strict';

const { sql, getPool, insertRow, toDtoRows } = require('../db');

/** Publication dans l'historique d'audit. */
async function addHistorique(user, action, commentaire, numeroChrono) {
  try {
    const pool = await getPool();
    await insertRow('historique', {
      utilisateur: user || 'Système',
      action,
      page_source: 'API',
      date: new Date(),
      commentaire: commentaire || '',
      numero_chronologique: numeroChrono ? String(numeroChrono) : null,
    });
  } catch (e) {
    console.error('[services] historique ignoré :', e.message);
  }
}

async function listHistorique(numeroChronologique) {
  const pool = await getPool();
  if (numeroChronologique && String(numeroChronologique).trim()) {
    const res = await pool
      .request()
      .input('nc', sql.NVarChar, String(numeroChronologique).trim())
      .query(`SELECT * FROM [historique] WHERE numero_chronologique = @nc ORDER BY ROWID DESC`);
    return toDtoRows('historique', res.recordset);
  }
  const res = await pool.request().query(`SELECT TOP 500 * FROM [historique] ORDER BY ROWID DESC`);
  return toDtoRows('historique', res.recordset);
}

module.exports = { addHistorique, listHistorique };