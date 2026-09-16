'use strict';

const { sql, getPool, insertRow, toDtoRows, toDtoFirst } = require('../db');
const { normEmail, todayFr } = require('./shared');

async function listDiffusions() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT * FROM [Diffusions] ORDER BY ROWID DESC`);
  return toDtoRows('Diffusions', res.recordset);
}

async function listDiffusionsByDemande(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numero))
    .query(`SELECT * FROM [Diffusions] WHERE Num_Dem = @nd ORDER BY ROWID DESC`);
  return toDtoRows('Diffusions', res.recordset);
}

async function createDiffusion(diffusion) {
  const pool = await getPool();
  const res = await insertRow('Diffusions', {
    Num_Dem: String(diffusion.Num_Dem || diffusion.numero_demande || ''),
    Email: normEmail(diffusion.Email || diffusion.email || ''),
    Date_Diffusion: diffusion.Date_Diffusion || todayFr(),
    NomPrenom: diffusion.NomPrenom || null,
  });
  if (!res.idValue) {
    const row = await pool
      .request()
      .input('nd', sql.NVarChar, String(diffusion.Num_Dem || diffusion.numero_demande || ''))
      .query(`SELECT TOP 1 * FROM [Diffusions] WHERE Num_Dem = @nd ORDER BY ROWID DESC`);
    return toDtoFirst('Diffusions', row.recordset);
  }
  const row = await pool
    .request()
    .input('rid', sql.Int, res.idValue)
    .query(`SELECT * FROM [Diffusions] WHERE ROWID = @rid`);
  return toDtoFirst('Diffusions', row.recordset);
}

module.exports = { listDiffusions, listDiffusionsByDemande, createDiffusion };