'use strict';

const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../db');
const { isHash, normEmail } = require('./shared');

const BCRYPT_SALT = 12;

/** Hashage bcrypt d'un mot de passe (coût 12, format $2b$). */
function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), BCRYPT_SALT);
}

async function findUserByEmail(pool, email) {
  const res = await pool
    .request()
    .input('email', sql.NVarChar, normEmail(email))
    .query(`SELECT * FROM [Utilisateurs] WHERE LOWER(LTRIM(RTRIM(email))) = @email`);
  return res.recordset[0] || null;
}

/** Valide les identifiants (bcrypt). Retourne la ligne utilisateur ou null. */
async function authenticateUser(email, password) {
  const pool = await getPool();
  const user = await findUserByEmail(pool, email);
  if (!user) return null;
  if (!isHash(user.password)) {
    // Migration on-demand : mot de passe en clair dans la BDD → hashage au premier login.
    const hashed = hashPassword(user.password);
    await pool
      .request()
      .input('uid', sql.Int, user.rowid)
      .input('hash', sql.NVarChar, hashed)
      .query(`UPDATE [Utilisateurs] SET password = @hash WHERE rowid = @uid`);
    user.password = hashed;
  }
  const ok = bcrypt.compareSync(String(password), user.password);
  return ok ? user : null;
}

module.exports = { hashPassword, findUserByEmail, authenticateUser };