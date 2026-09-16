/**
 * Migration RBAC : crée/synchronise le rôle individuel `user_<rowid>` de chaque
 * utilisateur avec ses permissions (dérivées du bit-string Accees + flags).
 * Idempotent : ne touche que ce qui manque.
 * Usage : node src/scripts/migrate-access.js
 */

'use strict';

require('dotenv').config();
const { getPool, sql } = require('../db');
const { POSITION_PERMISSIONS } = require('../rbac');

const SITE_MAP = { '0': 'SS', '1': 'JO', '2': 'EF', '3': 'JOF' };
const SITE_POSITIONS = {
  16: 'site.charge',
  17: 'site.responsable',
  19: 'site.plan_action',
  20: 'site.cloture',
  21: 'site.validation_prt',
};

async function permIdByCode(pool, code) {
  const res = await pool.request().input('code', sql.NVarChar, code).query(`SELECT id_perm FROM [Permissions] WHERE code = @code`);
  return res.recordset[0] ? res.recordset[0].id_perm : null;
}

async function main() {
  const pool = await getPool();
  const users = await pool.request().query(
    `SELECT rowid, email, prenom, nom, Accees, DirecteurAQ, MemberAQ FROM [Utilisateurs] WHERE ISNULL(email,'') <> ''`
  );

  let roles = 0;
  let links = 0;
  let perms = 0;

  for (const u of users.recordset) {
    const roleCode = `user_${u.rowid}`;
    let idRole = null;
    const role = await pool.request().input('code', sql.NVarChar, roleCode).query(`SELECT id_role FROM [Roles] WHERE code = @code`);
    if (role.recordset[0]) {
      idRole = role.recordset[0].id_role;
    } else {
      const libelle = `${String(u.prenom || '').trim()} ${String(u.nom || '').trim()}`.trim() || u.email;
      const ins = await pool
        .request()
        .input('code', sql.NVarChar, roleCode)
        .input('lib', sql.NVarChar, `${libelle} (${u.email})`)
        .query(
          `INSERT INTO [Roles] (code, libelle) OUTPUT INSERTED.id_role VALUES (@code, @lib)`
        );
      idRole = ins.recordset[0].id_role;
      roles += 1;
    }

    await pool
      .request()
      .input('uid', sql.Int, u.rowid)
      .input('rid', sql.Int, idRole)
      .query(
        `INSERT INTO [Utilisateur_Roles] (id_user, id_role)
         SELECT @uid, @rid WHERE NOT EXISTS (SELECT 1 FROM [Utilisateur_Roles] WHERE id_user = @uid AND id_role = @rid)`
      );
    links += 1;

    // Permissions depuis le bit-string Accees + flags.
    const accees = String(u.Accees || '').padEnd(22, '0');
    const codes = new Set();
    for (const [pos, code] of Object.entries(POSITION_PERMISSIONS)) {
      if (accees[Number(pos)] === '1') codes.add(code);
    }
    if (String(u.DirecteurAQ || '') === '1') {
      codes.add('qa.directeur');
      codes.add('approbation.directeur_qualite');
    }
    if (String(u.MemberAQ || '') === '1') codes.add('qa.membre');
    for (const [pos, code] of Object.entries(SITE_POSITIONS)) {
      const ch = accees[Number(pos)];
      if (ch && ch !== '0') codes.add(code);
    }
    // Rôle spécial (position 18)
    const special = accees[18];
    if (special === '2') codes.add('role.compliance');
    else if (special === '3') codes.add('role.reglementaire');
    else if (special === '4') codes.add('role.pharmacovigilance');

    for (const code of codes) {
      const idPerm = await permIdByCode(pool, code);
      if (!idPerm) continue;
      const exists = await pool
        .request()
        .input('rid', sql.Int, idRole)
        .input('pid', sql.Int, idPerm)
        .query(`SELECT 1 FROM [Role_Permissions] WHERE id_role = @rid AND id_perm = @pid`);
      if (exists.recordset.length === 0) {
        await pool
          .request()
          .input('rid', sql.Int, idRole)
          .input('pid', sql.Int, idPerm)
          .query(`INSERT INTO [Role_Permissions] (id_role, id_perm) VALUES (@rid, @pid)`);
        perms += 1;
      }
    }
  }

  console.log(`OK : ${roles} rôle(s) créé(s), ${links} affectation(s) vérifiée(s), ${perms} permission(s) ajoutée(s).`);
  await pool.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('ÉCHEC :', e.message);
  process.exit(1);
});