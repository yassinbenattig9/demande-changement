/**
 * Vérifie la connectivité à la base DCMEDICIS et affiche un aperçu du schéma.
 * Usage : node src/scripts/check-db.js
 */

'use strict';

require('dotenv').config();
const { getPool, getColumns, getIdentityColumn } = require('../db');

const TABLES_TO_CHECK = [
  'Demande',
  'Sujet_Demande',
  'Approbation',
  'Service_impactees',
  'Plan_actions',
  'Reunion',
  'Diffusions',
  'mailing',
  'historique',
  'Utilisateurs',
  'Notifications',
  'Tab_Divers',
  'serveur',
];

async function main() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT DB_NAME() AS db, @@VERSION AS v, COUNT(*) FROM sys.tables`);
  console.log(`DB connectée : ${res.recordset[0].db}`);
  console.log(`Version      : ${res.recordset[0].v.split('\n')[0]}`);

  const count = await pool.request().query(`SELECT COUNT(*) AS n FROM sys.tables`);
  console.log(`Tables       : ${count.recordset[0].n}`);

  for (const table of TABLES_TO_CHECK) {
    const cols = await getColumns(table);
    const identity = await getIdentityColumn(table);
    console.log(`\n${table} (${cols.length} colonnes, identité: ${identity ?? 'aucune'})`);
    console.log(
      cols
        .slice(0, 12)
        .map((c) => `  ${c.name} (${c.dataType})`)
        .join('\n')
    );
    if (cols.length > 12) console.log(`  … +${cols.length - 12} autres colonnes`);
  }

  await pool.close();
  console.log('\nOK : structure inspectée.');
}

main().catch((e) => {
  console.error('ÉCHEC de la connexion :', e.message);
  process.exit(1);
});