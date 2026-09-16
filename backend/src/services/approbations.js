'use strict';

const { sql, getPool, toDtoRows } = require('../db');
const { getActiveWorkflow } = require('../workflow');

async function listApprobations(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numero))
    .query(`SELECT * FROM [Approbation] WHERE numero_demande = @nd ORDER BY numero_approbation ASC`);
  return toDtoRows('Approbation', res.recordset);
}

/** Version publiée (prête pour le frontend). */
async function getWorkflowCurrent() {
  const pool = await getPool();
  return getActiveWorkflow(pool);
}

module.exports = { listApprobations, getWorkflowCurrent };