/**
 * Hachage bcrypt des mots de passe en clair de la table Utilisateurs.
 * Usage : node src/scripts/hash-passwords.js
 * Identique au comportement de premier login (migration on-demand) mais en lot.
 */

'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');

const SALT = 12;

async function main() {
  const pool = await getPool();
  const users = await pool.request().query(`SELECT rowid, email, password FROM [Utilisateurs]`);
  let hashed = 0;
  let skipped = 0;

  for (const u of users.recordset) {
    const pwd = String(u.password || '');
    if (pwd.startsWith('$2')) {
      skipped += 1;
      continue;
    }
    const hash = bcrypt.hashSync(pwd, SALT);
    await pool
      .request()
      .input('uid', sql.Int, u.rowid)
      .input('hash', sql.NVarChar, hash)
      .query(`UPDATE [Utilisateurs] SET password = @hash WHERE rowid = @uid`);
    hashed += 1;
    console.log(`  ${u.email} → hashé`);
  }

  console.log(`OK : ${hashed} mot(s) de passe hashé(s), ${skipped} déjà bcrypt.`);
  await pool.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('ÉCHEC :', e.message);
  process.exit(1);
});