/**
 * RBAC serveur — Module de contrôle d'accès basé sur les rôles (Phase C).
 *
 * Tables utilisées : Roles, Permissions, Role_Permissions, Utilisateur_Roles.
 * Le bit-string `Accees` de la table Utilisateurs est gardé pour rétro-compatibilité
 * mais la source de vérité côté serveur est la table Role_Permissions.
 *
 * Exposition : résolution des permissions par id_user, middlewares express.
 */

'use strict';

const { getPool, sql } = require('./db');

/* ------------------------------------------------------------------ */
/*  Catalogue des permissions (côté serveur uniquement)                */
/* ------------------------------------------------------------------ */

/** Position dans le bit-string Accees → code de permission. */
const POSITION_PERMISSIONS = {
  0:  'acces.base',
  1:  'demande.creer',
  2:  'approbation.responsable_service',
  3:  'approbation.charge_changement',
  4:  'approbation.responsable_changement',
  5:  'approbation.prt',
  6:  'consultation',
  7:  'plan_action',
  8:  'evaluation_cloture',
  9:  'reunions',
  10: 'parametrage_mailing',
  11: 'parametrages',
  13: 'admin.utilisateurs',
  14: 'avis_services',
  15: 'historique',
  // 16-21 : accès site → portés par Role_Permissions.site_code (pas un flag pur)
  // 18 : rôle spécial (2=compliance, 3=reglementaire, 4=pharmacovigilance) — géré séparément
};

/** Code de permission → { label, module }. */
const PERMISSIONS_CATALOG = {
  'acces.base':                        { label: 'Accès au portail',              module: 'Portail' },
  'demande.creer':                     { label: 'Créer des demandes',            module: 'Demandes' },
  'approbation.responsable_service':   { label: 'Approuver en tant que responsable service', module: 'Approbations' },
  'approbation.charge_changement':     { label: 'Approuver en tant que charge de changement', module: 'Approbations' },
  'approbation.responsable_changement':{ label: 'Approuver en tant que responsable changement', module: 'Approbations' },
  'approbation.prt':                   { label: 'Approuver en tant que PRT',     module: 'Approbations' },
  'consultation':                      { label: 'Consulter les demandes',        module: 'Demandes' },
  'plan_action':                       { label: 'Gérer les plans d\'actions',    module: 'Plan d\'actions' },
  'evaluation_cloture':                { label: 'Évaluation / clôture',          module: 'Clôture' },
  'reunions':                          { label: 'Gérer les réunions',            module: 'Réunions' },
  'parametrage_mailing':               { label: 'Paramétrer le mailing',         module: 'Mailing' },
  'parametrages':                      { label: 'Paramétrage général',           module: 'Paramétrage' },
  'admin.utilisateurs':                { label: 'Administration utilisateurs',   module: 'Administration' },
  'avis_services':                     { label: 'Avis des services impactés',    module: 'Avis' },
  'historique':                        { label: 'Consultation historique',        module: 'Audit' },
  // Rôles spéciaux (position 18)
  'role.compliance':                   { label: 'Rôle Compliance',               module: 'Rôles spéciaux' },
  'role.reglementaire':                { label: 'Rôle Réglementaire',            module: 'Rôles spéciaux' },
  'role.pharmacovigilance':            { label: 'Rôle Pharmacovigilance',        module: 'Rôles spéciaux' },
  // Flags DirecteurAQ / MemberAQ
  'qa.directeur':                      { label: 'Directeur de la qualité',       module: 'Qualité' },
  'qa.membre':                         { label: 'Membre AQ',                     module: 'Qualité' },
  'approbation.directeur_qualite':     { label: 'Approbation directeur qualité', module: 'Approbations' },
  // Accès sites (position 16-21 → Role_Permissions.site_code)
  'site.charge':                       { label: 'Chargé site',                   module: 'Sites' },
  'site.responsable':                  { label: 'Responsable site',              module: 'Sites' },
  'site.plan_action':                  { label: 'Plan actions site',             module: 'Sites' },
  'site.cloture':                      { label: 'Clôture site',                  module: 'Sites' },
  'site.validation_prt':               { label: 'Validation PRT site',           module: 'Sites' },
};

/* ------------------------------------------------------------------ */
/*  Résolution des permissions (DB → Set<string>)                      */
/* ------------------------------------------------------------------ */

const ACCEES_LENGTH = 22;

/**
 * Résout les permissions serveur pour un utilisateur donné.
 * Source : Utilisateur_Roles → Role_Permissions (table RBAC).
 * Si l'utilisateur n'a aucun rôle RBAC (migration pas encore exécutée),
 * fallback : résolution depuis le bit-string `Accees` + flags.
 * Retourne un objet { permissions: string[], roles: string[], siteAccess: {} }
 *   siteAccess = { position: siteCode } pour les positions site.
 */
async function resolvePermissions(userId) {
  const pool = await getPool();

  // Essai RBAC d'abord
  const rbacRes = await pool
    .request()
    .input('uid', sql.Int, userId)
    .query(`
      SELECT DISTINCT p.code AS permission_code
      FROM [Utilisateur_Roles] ur
      JOIN [Role_Permissions] rp ON rp.id_role = ur.id_role
      JOIN [Permissions] p       ON p.id_perm = rp.id_perm
      WHERE ur.id_user = @uid
    `);

  if (rbacRes.recordset.length > 0) {
    const perms = new Set(rbacRes.recordset.map((r) => r.permission_code));

    // Résoudre les rôles
    const rolesRes = await pool
      .request()
      .input('uid', sql.Int, userId)
      .query(`
        SELECT r.code AS role_code
        FROM [Utilisateur_Roles] ur
        JOIN [Roles] r ON r.id_role = ur.id_role
        WHERE ur.id_user = @uid
      `);
    const roles = rolesRes.recordset.map((r) => r.role_code);

    // Résoudre les accès site depuis Role_Permissions.site_code
    const siteRes = await pool
      .request()
      .input('uid', sql.Int, userId)
      .query(`
        SELECT p.code AS permission_code, rp.site_code
        FROM [Utilisateur_Roles] ur
        JOIN [Role_Permissions] rp ON rp.id_role = ur.id_role
        JOIN [Permissions] p       ON p.id_perm = rp.id_perm
        WHERE ur.id_user = @uid AND rp.site_code IS NOT NULL
      `);
    const siteAccess = {};
    for (const r of siteRes.recordset) {
      siteAccess[r.permission_code] = r.site_code;
    }

    return { permissions: [...perms], roles, siteAccess };
  }

  // Fallback : résolution depuis Accees + flags (pré-migration)
  return resolveFromAccees(userId);
}

/**
 * Fallback : résout les permissions depuis le bit-string Accees + flags DirecteurAQ/MemberAQ/Role_user.
 * Appelé uniquement si l'utilisateur n'a pas encore de rôle RBAC.
 */
async function resolveFromAccees(userId) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('uid', sql.Int, userId)
    .query(`SELECT * FROM [Utilisateurs] WHERE rowid = @uid`);
  const user = res.recordset[0];
  if (!user) return { permissions: [], roles: [], siteAccess: {} };

  const accees = String(user.Accees ?? '').padEnd(ACCEES_LENGTH, '0');
  const perms = new Set();

  // Permissions depuis le bit-string
  for (const [pos, code] of Object.entries(POSITION_PERMISSIONS)) {
    if (accees[Number(pos)] === '1') perms.add(code);
  }

  // Flags DirecteurAQ / MemberAQ
  if (user.DirecteurAQ === '1') {
    perms.add('qa.directeur');
    perms.add('approbation.directeur_qualite');
  }
  if (user.MemberAQ === '1') perms.add('qa.membre');

  // Rôle spécial (position 18)
  const roleSpecialCode = accees[18];
  if (roleSpecialCode === '2') perms.add('role.compliance');
  else if (roleSpecialCode === '3') perms.add('role.reglementaire');
  else if (roleSpecialCode === '4') perms.add('role.pharmacovigilance');

  // Accès site (positions 16-21 → code 0=SS, 1=JO, 2=EF, 3=JO+EF)
  const SITE_MAP = { '0': 'SS', '1': 'JO', '2': 'EF', '3': 'JOF' };
  const SITE_POSITIONS = {
    16: 'site.charge',
    17: 'site.responsable',
    19: 'site.plan_action',
    20: 'site.cloture',
    21: 'site.validation_prt',
  };
  const siteAccess = {};
  for (const [pos, permCode] of Object.entries(SITE_POSITIONS)) {
    const ch = accees[Number(pos)];
    if (ch !== '0') {
      perms.add(permCode);
      siteAccess[permCode] = SITE_MAP[ch] ?? ch;
    }
  }

  return { permissions: [...perms], roles: [], siteAccess };
}

/* ------------------------------------------------------------------ */
/*  Middlewares express                                                */
/* ------------------------------------------------------------------ */

/**
 * Résout les permissions de l'utilisateur connecté et les attache à req.userPermissions.
 * Appelé une seule fois par requête (cache léger dans req).
 */
async function resolveRequestPermissions(req, _res, next) {
  try {
    const userId = req.session?.user?.id_user;
    if (!userId) return next();
    const result = await resolvePermissions(userId);
    req.userPermissions = result.permissions;
    req.userRoles = result.roles;
    req.userSiteAccess = result.siteAccess;
  } catch (e) {
    console.error('[RBAC] Erreur résolution permissions :', e.message);
    req.userPermissions = [];
    req.userRoles = [];
    req.userSiteAccess = {};
  }
  return next();
}

/**
 * Middleware : vérifie que l'utilisateur possède AU MOINS UNE des permissions listées.
 * Retourne 403 si aucune ne correspond.
 */
function requireAnyPermission(codes) {
  const allowed = new Set(codes);
  return (req, res, next) => {
    const perms = new Set(req.userPermissions ?? []);
    for (const code of allowed) {
      if (perms.has(code)) return next();
    }
    return res.status(403).json({
      error: 'Accès interdit',
      details: `Permission requise : ${codes.join(' OU ')}`,
    });
  };
}

/**
 * Middleware : vérifie que l'utilisateur possède TOUTES les permissions listées.
 */
function requireAllPermissions(codes) {
  return (req, res, next) => {
    const perms = new Set(req.userPermissions ?? []);
    const missing = codes.filter((c) => !perms.has(c));
    if (missing.length === 0) return next();
    return res.status(403).json({
      error: 'Accès interdit',
      details: `Permissions manquantes : ${missing.join(', ')}`,
    });
  };
}

/**
 * Raccourci : requireAnyPermission pour UNE seule permission.
 */
function requirePermission(code) {
  return requireAnyPermission([code]);
}

module.exports = {
  PERMISSIONS_CATALOG,
  POSITION_PERMISSIONS,
  resolvePermissions,
  resolveFromAccees,
  resolveRequestPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
};
