'use strict';

const { sql, getPool, insertRow, toDtoRows, toDtoFirst } = require('../db');

async function listSujets(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.Int, numero)
    .query(`SELECT * FROM [Sujet_Demande] WHERE numero_demande = @nd ORDER BY ROWID ASC`);
  return toDtoRows('Sujet_Demande', res.recordset);
}

async function addSujet(numero, sujet) {
  const pool = await getPool();
  const inserted = await insertRow('Sujet_Demande', {
    numero_demande: numero,
    Sujet: sujet.Sujet || '',
    Designation: sujet.Designation || '',
    Code_ou_indexation: sujet.Code_ou_indexation || '',
  });
  const res = await pool
    .request()
    .input('nd', sql.Int, numero)
    .input('rid', sql.Int, inserted.idValue)
    .query(`SELECT * FROM [Sujet_Demande] WHERE numero_demande = @nd AND ROWID = @rid`);
  return toDtoFirst('Sujet_Demande', res.recordset);
}

module.exports = { listSujets, addSujet };