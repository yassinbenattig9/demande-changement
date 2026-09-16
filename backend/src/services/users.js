'use strict';

const { sql, getPool, insertRow, updateRow, getColumns } = require('../db');
const { hashPassword, findUserByEmail } = require('./auth');
const { isHash, normEmail } = require('./shared');
const { APPROBATION_PERMS } = require('../workflow');
const { ensureUserRole } = require('../workflow-admin');

/** Liste des utilisateurs. `query` : recherche libre ; `email` : filtrage strict. */
async function listUsers({ query, email } = {}) {
  const pool = await getPool();
  if (email) {
    const user = await findUserByEmail(pool, email);
    return user ? [user] : [];
  }
  let res;
  if (query && String(query).trim()) {
    const q = `%${String(query).trim()}%`;
    res = await pool
      .request()
      .input('q', sql.NVarChar, q)
      .query(
        `SELECT TOP 500 * FROM [Utilisateurs]
          WHERE email LIKE @q OR prenom LIKE @q OR nom LIKE @q OR service LIKE @q OR NomPrenom LIKE @q
          ORDER BY nom, prenom`
      );
  } else {
    res = await pool.request().query(`SELECT TOP 500 * FROM [Utilisateurs] ORDER BY nom, prenom`);
  }
  return res.recordset;
}

/** Approbateurs : utilisateurs ayant une permission d'approbation OU une fonction approbateur. */
async function listApprobateurs() {
  const pool = await getPool();
  const perms = APPROBATION_PERMS.map((p, i) => `@p${i}`).join(',');
  const req = pool.request();
  APPROBATION_PERMS.forEach((p, i) => req.input(`p${i}`, sql.NVarChar, p));
  const res = await req.query(
    `SELECT DISTINCT u.*
       FROM [Utilisateurs] u
       LEFT JOIN [Utilisateur_Roles]   ur ON ur.id_user = u.rowid
       LEFT JOIN [Role_Permissions]    rp ON rp.id_role = ur.id_role
       LEFT JOIN [Permissions]         p  ON p.id_perm = rp.id_perm
      WHERE p.code IN (${perms})
         OR EXISTS (SELECT 1 FROM [Approb_Fonction] af
                     WHERE af.Type LIKE '%Approbateur%' AND af.Nom_Fonction = u.fonction)
      ORDER BY u.nom, u.prenom`
  );
  return res.recordset;
}

/** Crée (ou retourne) le rôle individuel d'un utilisateur avec ses permissions minimales. */
async function ensureUserRoleWithDefaults(userId, email) {
  const pool = await getPool();
  const idRole = await ensureUserRole(pool, userId, email);
  await pool
    .request()
    .input('rid', sql.Int, idRole)
    .input('p1', sql.NVarChar, 'demande.creer')
    .input('p2', sql.NVarChar, 'consultation')
    .query(
      `INSERT INTO [Role_Permissions] (id_role, id_perm)
       SELECT @rid, id_perm FROM [Permissions] WHERE code IN (@p1, @p2)
         AND NOT EXISTS (SELECT 1 FROM [Role_Permissions] WHERE id_role = @rid AND id_perm = [Permissions].id_perm)`
    );
  return idRole;
}

/** Création d'un utilisateur (mot de passe hashé) + rôle individuel. */
async function createUser(data) {
  const pool = await getPool();
  const cols = await getColumns('Utilisateurs');
  const values = {};
  for (const c of cols) {
    const key = c.name;
    if (data[key] === undefined || data[key] === null) continue;
    if (key === 'password') continue;
    if (key === 'DirecteurAQ') values[key] = data[key] === true || data[key] === 1 || data[key] === '1' ? '1' : '0';
    else if (key === 'MemberAQ') values[key] = data[key] === true || data[key] === 1 || data[key] === '1' ? '1' : '0';
    else if (key === 'Etat') values[key] = data.Etat === undefined ? 1 : data.Etat;
    else values[key] = data[key];
  }
  if (data.password && !isHash(data.password)) values.password = hashPassword(data.password);
  values.email = normEmail(data.email);
  if (!values.NomPrenom && (data.prenom || data.nom)) {
    values.NomPrenom = `${data.prenom || ''} ${data.nom || ''}`.trim();
  }
  const inserted = await insertRow('Utilisateurs', values);
  const idUser = inserted.idValue;
  const idRole = await ensureUserRoleWithDefaults(idUser, values.email);
  await pool
    .request()
    .input('uid', sql.Int, idUser)
    .input('rid', sql.Int, idRole)
    .query(`INSERT INTO [Utilisateur_Roles] (id_user, id_role)
            SELECT @uid, @rid WHERE NOT EXISTS (
              SELECT 1 FROM [Utilisateur_Roles] WHERE id_user = @uid AND id_role = @rid)`);
  const row = await pool.request().input('uid', sql.Int, idUser).query(`SELECT * FROM [Utilisateurs] WHERE rowid = @uid`);
  return row.recordset[0] || null;
}

/** Mise à jour d'un utilisateur (par rowid). */
async function updateUser(id, patch) {
  const pool = await getPool();
  const values = { ...patch };
  if (values.password && !isHash(values.password)) values.password = hashPassword(values.password);
  if (Object.prototype.hasOwnProperty.call(values, 'DirecteurAQ') && typeof values.DirecteurAQ === 'boolean') {
    values.DirecteurAQ = values.DirecteurAQ ? '1' : '0';
  }
  if (Object.prototype.hasOwnProperty.call(values, 'MemberAQ') && typeof values.MemberAQ === 'boolean') {
    values.MemberAQ = values.MemberAQ ? '1' : '0';
  }
  if (values.NomPrenom === undefined && (values.prenom || values.nom)) {
    delete values.NomPrenom;
  }
  await updateRow('Utilisateurs', 'rowid', id, values);
  const row = await pool.request().input('uid', sql.Int, id).query(`SELECT * FROM [Utilisateurs] WHERE rowid = @uid`);
  return row.recordset[0] || null;
}

module.exports = { listUsers, listApprobateurs, ensureUserRoleWithDefaults, createUser, updateUser };