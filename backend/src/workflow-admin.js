/**
 * Administration du workflow configurable + administration RBAC (Phase B/C).
 *
 * Ces fonctions sont appelées par les routes sous `/admin/…`, elles-mêmes
 * protégées par `requirePermission('parametrages')` / `requirePermission('admin.utilisateurs')`.
 */

'use strict';

const { sql, insertRow, updateRow, deleteRow } = require('./db');
const {
  defaultStages,
  defaultApprobateurs,
  loadWorkflowDetail,
  getActiveWorkflow,
} = require('./workflow');

/* ------------------------------------------------------------------ */
/*  Configuration & versions                                           */
/* ------------------------------------------------------------------ */

/** Liste des configurations avec leurs versions (triées par numéro décroissant). */
async function listWorkflowConfigs(pool) {
  const configs = await pool.request().query(
    `SELECT id_workflow, code, libelle, actif
       FROM [Workflow_Config]
      ORDER BY id_workflow`
  );
  const out = [];
  for (const c of configs.recordset) {
    const versions = await pool
      .request()
      .input('idw', sql.Int, c.id_workflow)
      .query(
        `SELECT id_version, id_workflow, numero, statut, date_publication
           FROM [Workflow_Version]
          WHERE id_workflow = @idw
          ORDER BY numero DESC`
      );
    out.push({
      id_workflow: c.id_workflow,
      code: c.code,
      libelle: c.libelle,
      actif: c.actif,
      versions: versions.recordset.map((v) => ({
        id_version: v.id_version,
        id_workflow: v.id_workflow,
        numero: v.numero,
        statut: v.statut,
        date_publication: v.date_publication,
      })),
    });
  }
  return out;
}

/** Bundle admin : { configs: [...], active: WorkflowDetail | null }. */
async function getWorkflowAdmin(pool) {
  const configs = await listWorkflowConfigs(pool);
  const active = await getActiveWorkflow(pool);
  return { configs, active };
}

/** Détail d'une version précise (utilisée par `/admin/workflow/versions/:id`). */
async function getWorkflowVersionDetail(pool, idVersion) {
  return loadWorkflowDetail(pool, idVersion);
}

/**
 * Crée une nouvelle version « brouillon » en recopiant la dernière version
 * (publiée si possible) de la configuration. S'il n'existe encore aucune
 * version, initialise les 6 étapes par défaut du workflow de validation.
 */
async function createWorkflowVersion(pool, idWorkflow) {
  const versions = await pool
    .request()
    .input('idw', sql.Int, idWorkflow)
    .query(
      `SELECT id_version, numero, statut
         FROM [Workflow_Version]
        WHERE id_workflow = @idw
        ORDER BY statut, numero DESC`
    );

  const template =
    versions.recordset.find((v) => v.statut === 'publiee') || versions.recordset[0] || null;
  const numero = versions.recordset.reduce((max, v) => Math.max(max, Number(v.numero) || 0), 0) + 1;

  const inserted = await insertRow('Workflow_Version', {
    id_workflow: idWorkflow,
    numero,
    statut: 'brouillon',
    date_creation: new Date(),
    date_publication: null,
  });
  const idVersion = inserted.idValue;

  if (template) {
    const source = await loadWorkflowDetail(pool, template.id_version);
    for (const stage of source.etapes) {
      const stageInserted = await insertRow('Workflow_Etape', {
        id_version: idVersion,
        code: stage.code,
        libelle: stage.libelle,
        ordre: stage.ordre,
        mode: stage.mode,
        strategie: stage.strategie,
        min_decisions: stage.min_decisions,
      });
      for (const ap of stage.approbateurs) {
        await insertRow('Workflow_Etape_Approbateur', {
          id_etape: stageInserted.idValue,
          type: ap.type,
          id_reference: ap.id_reference,
          ordre: ap.ordre,
          obligatoire: ap.obligatoire,
        });
      }
    }
  } else {
    for (const stage of defaultStages()) {
      const stageInserted = await insertRow('Workflow_Etape', {
        id_version: idVersion,
        code: stage.code,
        libelle: stage.libelle,
        ordre: stage.ordre,
        mode: stage.mode,
        strategie: stage.strategie,
        min_decisions: stage.min_decisions,
      });
      for (const ap of defaultApprobateurs(stage.code)) {
        await insertRow('Workflow_Etape_Approbateur', {
          id_etape: stageInserted.idValue,
          type: ap.type,
          id_reference: ap.id_reference,
          ordre: ap.ordre,
          obligatoire: ap.obligatoire,
        });
      }
    }
  }

  return loadWorkflowDetail(pool, idVersion);
}

/** Publie une version : la version devient 'publiee', les autres passent 'brouillon'. */
async function publishWorkflowVersion(pool, idWorkflow, idVersion) {
  const existing = await pool
    .request()
    .input('idv', sql.Int, idVersion)
    .query(`SELECT TOP 1 id_version FROM [Workflow_Version] WHERE id_version = @idv`);
  if (!existing.recordset[0]) throw Object.assign(new Error('Version introuvable'), { status: 404 });

  await pool
    .request()
    .input('idw', sql.Int, idWorkflow)
    .query(
      `UPDATE [Workflow_Version] SET statut = 'brouillon', date_publication = NULL WHERE id_workflow = @idw`
    );
  await pool
    .request()
    .input('idv', sql.Int, idVersion)
    .query(
      `UPDATE [Workflow_Version] SET statut = 'publiee', date_publication = GETDATE() WHERE id_version = @idv`
    );
  return loadWorkflowDetail(pool, idVersion);
}

/**
 * Met à jour la stratégie/mode d'une étape et remplace ses approbateurs.
 * Entrée : approbateurs = [{ type, id_reference, ordre, obligatoire }] (sans id).
 */
async function updateStageApprovers(pool, idVersion, etapeCode, approbateurs, opts = {}) {
  const etape = await pool
    .request()
    .input('idv', sql.Int, idVersion)
    .input('code', sql.NVarChar, etapeCode)
    .query(`SELECT id_etape FROM [Workflow_Etape] WHERE id_version = @idv AND code = @code`);
  const row = etape.recordset[0];
  if (!row) throw Object.assign(new Error('Étape introuvable dans cette version'), { status: 404 });

  const patch = {};
  if (opts.strategie) patch.strategie = String(opts.strategie);
  if (opts.mode) patch.mode = String(opts.mode);
  if (opts.min_decisions !== undefined && opts.min_decisions !== null) {
    patch.min_decisions = Number(opts.min_decisions) || 0;
  }
  if (Object.keys(patch).length > 0) await updateRow('Workflow_Etape', 'id_etape', row.id_etape, patch);

  // Remplace les approbateurs (DELETE puis INSERT).
  await deleteRow('Workflow_Etape_Approbateur', 'id_etape', row.id_etape);
  for (const ap of approbateurs || []) {
    await insertRow('Workflow_Etape_Approbateur', {
      id_etape: row.id_etape,
      type: ap.type === 'email' ? 'email' : 'role',
      id_reference: String(ap.id_reference || ''),
      ordre: Number(ap.ordre) || 1,
      obligatoire: ap.obligatoire === true || ap.obligatoire === 1 || ap.obligatoire === '1' || ap.obligatoire === undefined,
    });
  }

  return loadWorkflowDetail(pool, idVersion);
}

/* ------------------------------------------------------------------ */
/*  RBAC — rôles, permissions, affectations                            */
/* ------------------------------------------------------------------ */

/** Rôles avec nombre d'utilisateurs + permissions rattachées. */
async function listRoles(pool) {
  const roles = await pool.request().query(
    `SELECT r.id_role, r.code, r.libelle,
            (SELECT COUNT(*) FROM [Utilisateur_Roles] ur WHERE ur.id_role = r.id_role) AS nb_users
       FROM [Roles] r
      ORDER BY r.id_role`
  );
  const out = [];
  for (const r of roles.recordset) {
    const perms = await pool
      .request()
      .input('rid', sql.Int, r.id_role)
      .query(
        `SELECT p.code, p.libelle, p.module, rp.site_code
           FROM [Role_Permissions] rp
           JOIN [Permissions] p ON p.id_perm = rp.id_perm
          WHERE rp.id_role = @rid
          ORDER BY p.id_perm`
      );
    out.push({
      id_role: r.id_role,
      code: r.code,
      libelle: r.libelle,
      nb_users: Number(r.nb_users) || 0,
      permissions: perms.recordset.map((p) => ({
        code: p.code,
        libelle: p.libelle,
        module: p.module,
        site_code: p.site_code,
      })),
    });
  }
  return out;
}

/** Catalogue complet des permissions. */
async function listPermissions(pool) {
  const res = await pool.request().query(
    `SELECT id_perm, code, libelle, module FROM [Permissions] ORDER BY id_perm`
  );
  return res.recordset;
}

/** Bundle admin RBAC : { roles, permissions }. */
async function getRolesAdmin(pool) {
  const [roles, permissions] = await Promise.all([listRoles(pool), listPermissions(pool)]);
  return { roles, permissions };
}

/** Rôles affectés à un utilisateur (pour `/admin/users/:id/roles`). */
async function getUserRoles(pool, userId) {
  const res = await pool
    .request()
    .input('uid', sql.Int, userId)
    .query(
      `SELECT r.id_role, r.code, r.libelle
         FROM [Utilisateur_Roles] ur
         JOIN [Roles] r ON r.id_role = ur.id_role
        WHERE ur.id_user = @uid
        ORDER BY r.id_role`
    );
  return res.recordset;
}

/** Garantit l'existence du rôle individuel `user_<rowid>` d'un utilisateur. */
async function ensureUserRole(pool, userId, email) {
  const role = await pool
    .request()
    .input('rid', sql.NVarChar, `user_${userId}`)
    .query(`SELECT id_role FROM [Roles] WHERE code = @rid`);
  if (role.recordset[0]) return role.recordset[0].id_role;

  const user = await pool
    .request()
    .input('uid', sql.Int, userId)
    .query(`SELECT prenom, nom, email FROM [Utilisateurs] WHERE rowid = @uid`);
  const u = user.recordset[0] || { prenom: '', nom: '', email: email || '' };
  const libelle = `${String(u.prenom || '').trim()} ${String(u.nom || '').trim()}`.trim() || u.email;
  const inserted = await insertRow('Roles', {
    code: `user_${userId}`,
    libelle: `${libelle} (${u.email || ''})`,
  });
  return inserted.idValue;
}

/** Affecte les rôles (codes) à un utilisateur — remplace la précédente affectation. */
async function assignUserRoles(pool, userId, roleCodes) {
  const codes = Array.isArray(roleCodes) ? roleCodes.filter((c) => typeof c === 'string') : [];

  await pool.request().input('uid', sql.Int, userId).query(`DELETE FROM [Utilisateur_Roles] WHERE id_user = @uid`);

  for (const code of codes) {
    const role = await pool
      .request()
      .input('code', sql.NVarChar, code)
      .query(`SELECT id_role FROM [Roles] WHERE code = @code`);
    if (!role.recordset[0]) continue;
    await pool
      .request()
      .input('uid', sql.Int, userId)
      .input('rid', sql.Int, role.recordset[0].id_role)
      .query(
        `INSERT INTO [Utilisateur_Roles] (id_user, id_role)
         SELECT @uid, @rid WHERE NOT EXISTS (
           SELECT 1 FROM [Utilisateur_Roles] WHERE id_user = @uid AND id_role = @rid)`
      );
  }

  // Le rôle individuel de l'utilisateur reste toujours affecté.
  const userRole = await ensureUserRole(pool, userId);
  await pool
    .request()
    .input('uid', sql.Int, userId)
    .input('rid', sql.Int, userRole)
    .query(
      `INSERT INTO [Utilisateur_Roles] (id_user, id_role)
       SELECT @uid, @rid WHERE NOT EXISTS (
         SELECT 1 FROM [Utilisateur_Roles] WHERE id_user = @uid AND id_role = @rid)`
    );

  return getUserRoles(pool, userId);
}

/** Remplace les permissions d'un rôle (par code de permission). */
async function updateRolePermissions(pool, roleCode, permCodes) {
  const role = await pool
    .request()
    .input('code', sql.NVarChar, roleCode)
    .query(`SELECT id_role FROM [Roles] WHERE code = @code`);
  if (!role.recordset[0]) throw Object.assign(new Error('Rôle introuvable'), { status: 404 });
  const idRole = role.recordset[0].id_role;

  await pool.request().input('rid', sql.Int, idRole).query(`DELETE FROM [Role_Permissions] WHERE id_role = @rid`);

  for (const code of permCodes || []) {
    await pool
      .request()
      .input('rid', sql.Int, idRole)
      .input('code', sql.NVarChar, code)
      .query(
        `INSERT INTO [Role_Permissions] (id_role, id_perm)
         SELECT @rid, id_perm FROM [Permissions] WHERE code = @code
           AND NOT EXISTS (SELECT 1 FROM [Role_Permissions] WHERE id_role = @rid AND id_perm = [Permissions].id_perm)`
      );
  }

  const roles = await listRoles(pool);
  return roles.find((r) => r.id_role === idRole) || null;
}

module.exports = {
  listWorkflowConfigs,
  getWorkflowAdmin,
  getWorkflowVersionDetail,
  createWorkflowVersion,
  publishWorkflowVersion,
  updateStageApprovers,
  listRoles,
  listPermissions,
  getRolesAdmin,
  getUserRoles,
  assignUserRoles,
  updateRolePermissions,
  ensureUserRole,
};