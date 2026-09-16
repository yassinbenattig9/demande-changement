/**
 * Routes REST de l'API Medicis Change Control.
 *
 * Monté dans index.js sous `/api`. Toutes les routes (hors /auth/login et
 * /auth/me) exigent une session ouverte. Les routes d'administration sont
 * en plus gardées par RBAC (parametrages / admin.utilisateurs).
 */

'use strict';

const express = require('express');
const { getPool } = require('./db');
const rbac = require('./rbac');
const svc = require('./services');
const wf = require('./workflow');
const wa = require('./workflow-admin');

const router = express.Router();

/** Enveloppe un handler async (gestion centralisée des erreurs). */
const wrap = (fn) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, next)).catch(next);
  } catch (e) {
    next(e);
  }
};

/** Middleware d'authentification (session obligatoire). */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Non authentifié' });
}

const json = (res, data) => res.json(data);

/** Retire le champ password (hash) des objets utilisateurs exposés. */
function publicUser(u) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

/* ------------------------------------------------------------------ */
/*  Auth (publiques)                                                   */
/* ------------------------------------------------------------------ */

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await svc.authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    req.session.user = {
      id_user: user.rowid,
      email: String(user.email).trim().toLowerCase(),
      prenom: user.prenom || '',
      nom: user.nom || '',
      service: user.service || '',
      fonction: user.fonction || '',
    };
    const perms = await rbac.resolvePermissions(user.rowid);
    await svc.addHistorique(String(user.prenom || user.email), 'connexion', 'Connexion réussie', null);
    return res.json({
      success: true,
      user: publicUser(user),
      permissions: perms.permissions,
      roles: perms.roles,
      siteAccess: perms.siteAccess,
    });
  })
);

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get(
  '/auth/me',
  wrap(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.json({ user: null, permissions: [], roles: [], siteAccess: {} });
    }
    const pool = await getPool();
    const row = await pool
      .request()
      .input('uid', sql_int(), req.session.user.id_user)
      .query(`SELECT * FROM [Utilisateurs] WHERE rowid = @uid`);
    if (row.recordset.length === 0) {
      return res.json({ user: null, permissions: [], roles: [], siteAccess: {} });
    }
    const perms = await rbac.resolvePermissions(req.session.user.id_user);
    return res.json({
      user: publicUser(row.recordset[0]),
      permissions: perms.permissions,
      roles: perms.roles,
      siteAccess: perms.siteAccess,
    });
  })
);

function sql_int() {
  return require('./db').sql.Int;
}

/* ------------------------------------------------------------------ */
/*  Protection des routes suivantes                                    */
/* ------------------------------------------------------------------ */

router.use(requireAuth);
router.use(rbac.resolveRequestPermissions);

const requirePermission = rbac.requirePermission;
const requireAnyPermission = rbac.requireAnyPermission;

/* ------------------------------------------------------------------ */
/*  Demandes                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/demandes',
  wrap(async (req, res) => {
    const rows = await svc.listDemandes(req.query || {});
    return json(res, rows);
  })
);

router.get(
  '/demandes/:id(\\d+)',
  wrap(async (req, res) => {
    const d = await svc.getDemandeById(Number(req.params.id));
    if (!d) return res.status(404).json({ error: 'Demande introuvable' });
    return json(res, d);
  })
);

router.post(
  '/demandes',
  wrap(async (req, res) => {
    const d = await svc.createDemande(req.body || {});
    return res.status(201).json(d);
  })
);

// Sujets
router.get(
  '/demandes/:id(\\d+)/sujets',
  wrap(async (req, res) => json(res, await svc.listSujets(Number(req.params.id))))
);
router.post(
  '/demandes/:id(\\d+)/sujets',
  wrap(async (req, res) => json(res, await svc.addSujet(Number(req.params.id), req.body || {})))
);

// Approbations
router.get(
  '/demandes/:id(\\d+)/approbations',
  wrap(async (req, res) => json(res, await svc.listApprobations(Number(req.params.id))))
);
router.put(
  '/demandes/:id(\\d+)/approbations/:type',
  wrap(async (req, res) => {
    const pool = await getPool();
    const result = await wf.submitApproval(pool, {
      numero_demande: Number(req.params.id),
      type_approbation: decodeURIComponent(req.params.type),
      email_approbant: (req.body || {}).email_approbant,
      decision: (req.body || {}).decision,
      commentaire: (req.body || {}).commentaire,
      markIncomplete: (req.body || {}).markIncomplete,
    });
    return json(res, result);
  })
);

// Impacts
router.get(
  '/demandes/:id(\\d+)/impacts',
  wrap(async (req, res) => json(res, await svc.listImpacts(Number(req.params.id))))
);
router.post(
  '/demandes/:id(\\d+)/impacts',
  wrap(async (req, res) => json(res, await svc.addImpact(Number(req.params.id), req.body || {})))
);
router.put(
  '/demandes/:id(\\d+)/impacts/:service/:email',
  wrap(async (req, res) => {
    const patched = await svc.updateImpact(
      Number(req.params.id),
      decodeURIComponent(req.params.service),
      decodeURIComponent(req.params.email),
      req.body || {}
    );
    if (!patched) return res.status(404).json({ error: 'Impact introuvable' });
    return json(res, patched);
  })
);

// Diffusions d'une demande
router.get(
  '/demandes/:id(\\d+)/diffusions',
  wrap(async (req, res) => json(res, await svc.listDiffusionsByDemande(Number(req.params.id))))
);

// Plans d'action d'une demande
router.get(
  '/demandes/:id(\\d+)/plans',
  wrap(async (req, res) => json(res, await svc.listPlans(Number(req.params.id))))
);

/* ------------------------------------------------------------------ */
/*  Plans d'action                                                     */
/* ------------------------------------------------------------------ */

router.post('/plans', wrap(async (req, res) => json(res, await svc.createPlan(req.body || {}))));
router.put('/plans/:id(\\d+)', wrap(async (req, res) => json(res, await svc.updatePlan(Number(req.params.id), req.body || {}))));

/* ------------------------------------------------------------------ */
/*  Réunions                                                           */
/* ------------------------------------------------------------------ */

router.get('/reunions', wrap(async (req, res) => json(res, await svc.listReunions())));
router.post('/reunions', wrap(async (req, res) => json(res, await svc.createReunion(req.body || {}))));

/* ------------------------------------------------------------------ */
/*  Diffusions                                                         */
/* ------------------------------------------------------------------ */

router.get('/diffusions', wrap(async (req, res) => json(res, await svc.listDiffusions())));
router.post('/diffusions', wrap(async (req, res) => json(res, await svc.createDiffusion(req.body || {}))));

/* ------------------------------------------------------------------ */
/*  Mailing                                                            */
/* ------------------------------------------------------------------ */

router.get('/mailings', wrap(async (req, res) => json(res, await svc.listMailings())));
router.post('/mailings', wrap(async (req, res) => json(res, await svc.createMailing(req.body || {}))));
router.put('/mailings/:id(\\d+)', wrap(async (req, res) => json(res, await svc.updateMailing(Number(req.params.id), req.body || {}))));

/* ------------------------------------------------------------------ */
/*  Historique                                                         */
/* ------------------------------------------------------------------ */

router.get(
  '/historique',
  wrap(async (req, res) => json(res, await svc.listHistorique(req.query.numero_chronologique)))
);

/* ------------------------------------------------------------------ */
/*  Utilisateurs                                                       */
/* ------------------------------------------------------------------ */

router.get(
  '/users',
  wrap(async (req, res) => {
    const rows = await svc.listUsers({ query: req.query.q, email: req.query.email });
    return json(res, rows.map(publicUser));
  })
);

router.get(
  '/users/approbateurs',
  wrap(async (req, res) => json(res, (await svc.listApprobateurs()).map(publicUser)))
);

router.post(
  '/users',
  wrap(async (req, res) => {
    const u = await svc.createUser(req.body || {});
    return res.status(201).json(u);
  })
);

router.put(
  '/users/:id(\\d+)',
  wrap(async (req, res) => {
    const u = await svc.updateUser(Number(req.params.id), req.body || {});
    if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
    return json(res, u);
  })
);

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

router.get(
  '/notifications/:email',
  wrap(async (req, res) => json(res, await svc.listNotifications(decodeURIComponent(req.params.email))))
);
router.put(
  '/notifications/:rowid(\\d+)/read',
  wrap(async (req, res) => {
    await svc.markNotificationRead(Number(req.params.rowid));
    return res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/*  Référentiels                                                       */
/* ------------------------------------------------------------------ */

router.get('/products', wrap(async (req, res) => json(res, await svc.listProducts())));
router.get('/tab-divers', wrap(async (req, res) => json(res, await svc.listTabDivers(req.query.parametre))));
router.post('/tab-divers', wrap(async (req, res) => json(res, await svc.addTabDivers(req.body || {}))));
router.delete('/tab-divers/:id(\\d+)', wrap(async (req, res) => {
  await svc.removeTabDivers(Number(req.params.id));
  return res.json({ success: true });
}));

/* ------------------------------------------------------------------ */
/*  Serveur & pièces jointes & stats                                   */
/* ------------------------------------------------------------------ */

router.get('/serveur', wrap(async (req, res) => json(res, await svc.getServeur())));
router.put('/serveur', wrap(async (req, res) => json(res, await svc.updateServeur(req.body || {}))));
router.get('/pieces-jointes', wrap(async (req, res) => json(res, await svc.listPiecesJointes())));
router.get('/stats/dashboard', wrap(async (req, res) => json(res, await svc.getDashboardStats())));

/* ------------------------------------------------------------------ */
/*  File d'approbation & workflow courant                               */
/* ------------------------------------------------------------------ */

router.get('/approbations/en-attente', wrap(async (req, res) => {
  const pool = await getPool();
  return json(res, await wf.getPendingApprovals(pool));
}));

router.get('/workflow/current', wrap(async (req, res) => {
  const pool = await getPool();
  return json(res, await wf.getWorkflowCurrent(pool));
}));

/* ------------------------------------------------------------------ */
/*  Administration du workflow (RBAC : parametrages)                   */
/* ------------------------------------------------------------------ */

router.get(
  '/admin/workflow',
  requirePermission('parametrages'),
  wrap(async (req, res) => {
    const pool = await getPool();
    return json(res, await wa.getWorkflowAdmin(pool));
  })
);

router.get(
  '/admin/workflow/versions/:idVersion(\\d+)',
  requirePermission('parametrages'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const detail = await wa.getWorkflowVersionDetail(pool, Number(req.params.idVersion));
    if (!detail) return res.status(404).json({ error: 'Version introuvable' });
    return json(res, detail);
  })
);

router.post(
  '/admin/workflow/:idWorkflow(\\d+)/versions',
  requirePermission('parametrages'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const detail = await wa.createWorkflowVersion(pool, Number(req.params.idWorkflow));
    return res.status(201).json(detail);
  })
);

router.post(
  '/admin/workflow/:idWorkflow(\\d+)/versions/:idVersion(\\d+)/publish',
  requirePermission('parametrages'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const detail = await wa.publishWorkflowVersion(pool, Number(req.params.idWorkflow), Number(req.params.idVersion));
    return json(res, detail);
  })
);

router.put(
  '/admin/workflow/versions/:idVersion(\\d+)/etapes/:etapeCode',
  requirePermission('parametrages'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const { approbateurs, strategie, mode, min_decisions } = req.body || {};
    const detail = await wa.updateStageApprovers(
      pool,
      Number(req.params.idVersion),
      decodeURIComponent(req.params.etapeCode),
      approbateurs || [],
      { strategie, mode, min_decisions }
    );
    return json(res, detail);
  })
);

/* ------------------------------------------------------------------ */
/*  Administration RBAC (RBAC : admin.utilisateurs)                    */
/* ------------------------------------------------------------------ */

router.get(
  '/admin/roles',
  requirePermission('admin.utilisateurs'),
  wrap(async (req, res) => {
    const pool = await getPool();
    return json(res, await wa.getRolesAdmin(pool));
  })
);

router.get(
  '/admin/users/:userId(\\d+)/roles',
  requirePermission('admin.utilisateurs'),
  wrap(async (req, res) => {
    const pool = await getPool();
    return json(res, await wa.getUserRoles(pool, Number(req.params.userId)));
  })
);

router.put(
  '/admin/users/:userId(\\d+)/roles',
  requirePermission('admin.utilisateurs'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const roles = await wa.assignUserRoles(pool, Number(req.params.userId), (req.body || {}).roles || []);
    return json(res, roles);
  })
);

router.put(
  '/admin/roles/:roleCode/permissions',
  requirePermission('admin.utilisateurs'),
  wrap(async (req, res) => {
    const pool = await getPool();
    const role = await wa.updateRolePermissions(pool, decodeURIComponent(req.params.roleCode), (req.body || {}).permissions || []);
    if (!role) return res.status(404).json({ error: 'Rôle introuvable' });
    return json(res, role);
  })
);

module.exports = router;