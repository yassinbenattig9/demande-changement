'use strict';

const { sql, getPool, insertRow, toDtoRows, toDtoFirst } = require('../db');
const { todayFr, nowFr } = require('./shared');

function union_date_creation(reunion) {
  const p = reunion.date_creation;
  if (typeof p === 'string' && p.trim()) return p;
  return todayFr();
}

async function listReunions() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT * FROM [Reunion] ORDER BY rowid DESC`);
  return toDtoRows('Reunion', res.recordset);
}

async function createReunion(reunion) {
  const pool = await getPool();
  const numeroFromDemandes = String(reunion.demandes_discutees || '').match(/\b(\d{4,})\b/);
  await insertRow('Reunion', {
    numero_demande: reunion.numero_demande || (numeroFromDemandes ? numeroFromDemandes[1] : ''),
    createur: reunion.participants || reunion.createur || 'Système',
    date: reunion.date_reunion || reunion.date || nowFr(),
    titre_reunion: reunion.ordre_du_jour || reunion.titre_reunion || 'Réunion de revue',
    date_creation: union_date_creation(reunion),
  });
  const res = await pool.request().query(`SELECT TOP 1 * FROM [Reunion] ORDER BY rowid DESC`);
  return toDtoFirst('Reunion', res.recordset);
}

module.exports = { listReunions, createReunion };