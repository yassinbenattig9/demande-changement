require('dotenv').config({ path: __dirname + '/../.env' });
const { getPool } = require('../db');
(async () => {
  const pool = await getPool();

  // Check Approbation references by email for the duplicate
  const ap = await pool.request().query("SELECT COUNT(*) c FROM [Approbation] WHERE email_approbant LIKE 'feriel.mrabet1@%' OR email_approbant LIKE 'feriel.mrabet@%'");
  console.log('Approbation rows referencing feriel emails:', JSON.stringify(ap.recordset));

  // Delete roles for the duplicate user 4324 then the user
  const r1 = await pool.request().query("DELETE FROM [Utilisateur_Roles] WHERE id_user=4324");
  console.log('Deleted roles for 4324:', r1.rowsAffected, 'rows');
  const r2 = await pool.request().query("DELETE FROM [Utilisateurs] WHERE rowid=4324");
  console.log('Deleted user 4324:', r2.rowsAffected, 'rows');

  // Verify
  const v7 = await pool.request().query("SELECT rowid, email, prenom, nom, Role_user FROM [Utilisateurs] WHERE prenom='Feriel' AND nom='Mrabet'");
  console.log('B7 verify users:', JSON.stringify(v7.recordset));

  // B8 cleanups
  const d8a = await pool.request().query("DELETE FROM [Tab_Divers] WHERE rowid=17104");
  console.log('B8 deleted empty-code SG:', d8a.rowsAffected, 'row(s)');
  const d8b = await pool.request().query("UPDATE [Tab_Divers] SET code='SG' WHERE rowid=17309");
  console.log('B8 fixed SGD→SG:', d8b.rowsAffected, 'row(s)');
  const v8 = await pool.request().query("SELECT rowid, code, designation FROM [Tab_Divers] WHERE parametre='site' AND (designation LIKE '%SG%' OR code LIKE '%SG%') ORDER BY code");
  console.log('B8 verify sites:', JSON.stringify(v8.recordset));

  await pool.close();
})().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
