'use strict';

const { sql, getPool, insertRow, deleteRow, toDtoRows, toDtoFirst } = require('../db');

async function listProducts() {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('pr', sql.NVarChar, 'produit')
    .query(`SELECT code, designation FROM [Tab_Divers] WHERE parametre = @pr AND ISNULL(code,'') <> '' ORDER BY designation`);
  return res.recordset.map((r) => ({ code: r.code, designation: r.designation }));
}

async function listTabDivers(parametre) {
  const pool = await getPool();
  let res;
  if (parametre && String(parametre).trim()) {
    res = await pool
      .request()
      .input('pr', sql.NVarChar, String(parametre).trim())
      .query(`SELECT * FROM [Tab_Divers] WHERE parametre = @pr ORDER BY designation`);
  } else {
    res = await pool.request().query(`SELECT * FROM [Tab_Divers] ORDER BY parametre, designation`);
  }
  return toDtoRows('Tab_Divers', res.recordset);
}

async function addTabDivers(item) {
  const pool = await getPool();
  await insertRow('Tab_Divers', {
    parametre: item.parametre || '',
    designation: item.designation || '',
    code: item.code || '',
    source: item.source || null,
  });
  const res = await pool
    .request()
    .input('pr', sql.NVarChar, item.parametre || '')
    .query(`SELECT TOP 1 * FROM [Tab_Divers] WHERE parametre = @pr ORDER BY rowid DESC`);
  return toDtoFirst('Tab_Divers', res.recordset);
}

async function removeTabDivers(id) {
  const pool = await getPool();
  await deleteRow('Tab_Divers', 'rowid', id);
}

module.exports = { listProducts, listTabDivers, addTabDivers, removeTabDivers };