'use strict';

const { sql, getPool, insertRow, updateRow, toDtoRows, toDtoFirst } = require('../db');
const { normEmail } = require('./shared');

async function listMailings() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT * FROM [mailing] ORDER BY rowid DESC`);
  return toDtoRows('mailing', res.recordset);
}

async function createMailing(mailing) {
  const pool = await getPool();
  const numero = Number(mailing.numero_demande || 0);
  let chrono = mailing.numero_chronologique || '';
  let etat = mailing.etat_demande || '';
  if (numero) {
    const d = await pool.request().input('nd', sql.Int, numero).query(`SELECT numero_chronologique, etat_demande FROM [Demande] WHERE numero_demande = @nd`);
    if (d.recordset[0]) {
      chrono = chrono || d.recordset[0].numero_chronologique || '';
      etat = etat || d.recordset[0].etat_demande || '';
    }
  }
  await insertRow('mailing', {
    numero_demande: String(numero || mailing.numero_demande || ''),
    email: normEmail(mailing.email || ''),
    message: mailing.message || '',
    frequence: mailing.frequence || 'Semaine',
    date_creation_mailing: new Date(),
    reponse: mailing.reponse || 'non',
    numero_chronologique: chrono,
    dernier_envoi: mailing.dernier_envoi || null,
    frequence_par_jour: mailing.frequence_par_jour || '30',
    etat_demande: etat,
    reponse_service: mailing.reponse_service || '',
  });
  const res = await pool.request().query(`SELECT TOP 1 * FROM [mailing] ORDER BY rowid DESC`);
  return toDtoFirst('mailing', res.recordset);
}

async function updateMailing(id, patch) {
  const pool = await getPool();
  const values = {};
  for (const key of ['email', 'message', 'frequence', 'reponse', 'numero_chronologique', 'frequence_par_jour', 'etat_demande', 'reponse_service']) {
    if (patch[key] !== undefined) values[key] = patch[key];
  }
  if (patch.dernier_envoi !== undefined) values.dernier_envoi = patch.dernier_envoi;
  if (Object.keys(values).length > 0) await updateRow('mailing', 'rowid', id, values);
  const res = await pool.request().input('rid', sql.Int, id).query(`SELECT * FROM [mailing] WHERE rowid = @rid`);
  return toDtoFirst('mailing', res.recordset);
}

module.exports = { listMailings, createMailing, updateMailing };