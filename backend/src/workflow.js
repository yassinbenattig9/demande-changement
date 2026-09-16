/**
 * Moteur de workflow configurable (Phase B).
 *
 * Le schéma legacy est intact : les requêtes s'appuient uniquement sur les
 * tables Workflow_Config / Workflow_Version / Workflow_Etape /
 * Workflow_Etape_Approbateur et Demande_Workflow, ainsi que sur le couple
 * Utilisateur_Roles → Role_Permissions → Permissions pour résoudre les
 * approbateurs d'une étape (chaque approbateur référence une PERMISSION).
 *
 * Le libellé legacy `Demande.etat_demande` est maintenu à jour à chaque
 * transition pour conserver la compatibilité des filtres de l'ancienne app.
 */

'use strict';

const { sql, getPool, insertRow, updateRow, toDtoRows } = require('./db');

/* ------------------------------------------------------------------ */
/*  Constantes métier                                                  */
/* ------------------------------------------------------------------ */

/** Type d'approbation legacy correspondant à chaque permission d'approbation. */
const TYPE_BY_PERM = {
  'approbation.responsable_service':    'acceptation_responsable_service',
  'approbation.charge_changement':      'acceptation_chargé_changement',
  'approbation.responsable_changement': 'acceptation_responsable_changement',
  'approbation.directeur_qualite':      'approbation_directeur_qualité',
  'approbation.prt':                    'approbation_PRT',
};

/** Permissions d'approbation (les types legacy définis dans TypeApprobation). */
const APPROBATION_PERMS = Object.keys(TYPE_BY_PERM);

/** Libellé legacy `etat_demande` à écrire quand une demande ENTRE dans une étape. */
const LEGACY_LABEL = {
  etape_submission:          'demande_éditée',
  etape_validation:          'demande_éditée',
  etape_validation_service:  'acceptation_responsable_service',
  etape_validation_qualite:  'approbation_directeur_qualité',
  etape_validation_prt:      'approbation_PRT',
  etape_impact:              'Demande de changement Impact défini',
  etape_implementation:      'Demande de changement en cours',
  etape_cloturee:            'clôturée_validée',
};

const TERMINAL_CODES = new Set(['etape_refusee', 'etape_incomplete', 'etape_cloturee']);

const ETAT_TERMINAUX = new Set([
  'refusée',
  'refus',
  'demande_incomplète',
  'demande_incomplete',
  'clôturée_validée',
  'cloturée_validée',
]);

/** Libellé legacy → code d'étape (utilisé par la file d'approbation héritée). */
function legacyLabelFor(stageCode) {
  return LEGACY_LABEL[stageCode] || stageCode;
}

/** Liste par défaut des 6 étapes (configuration initiale, mode création nouvelle version). */
function defaultStages() {
  return [
    { code: 'etape_submission',          libelle: 'Soumission de la demande',                           ordre: 1, mode: 'sequence',  strategie: 'tous',       min_decisions: 0 },
    { code: 'etape_validation',          libelle: 'Validation par les 4 approbateurs (parallèle)',      ordre: 2, mode: 'parallele', strategie: 'tous',       min_decisions: 0 },
    { code: 'etape_validation_prt',      libelle: 'Validation par le comité PRT',                       ordre: 3, mode: 'parallele', strategie: 'tous',       min_decisions: 0 },
    { code: 'etape_impact',              libelle: 'Impact défini',                                      ordre: 4, mode: 'sequence',  strategie: 'tous',       min_decisions: 0 },
    { code: 'etape_implementation',      libelle: 'Implémentation en cours',                            ordre: 5, mode: 'sequence',  strategie: 'tous',       min_decisions: 0 },
    { code: 'etape_cloturee',            libelle: 'Clôturée / validée',                                 ordre: 6, mode: 'sequence',  strategie: 'tous',       min_decisions: 0 },
  ];
}

/** Approbateurs par défaut des étapes à approbatation réellement parallèle. */
function defaultApprobateurs(stageCode) {
  const byPermission = {
    etape_validation: [
      'approbation.responsable_service',
      'approbation.charge_changement',
      'approbation.responsable_changement',
      'approbation.directeur_qualite',
    ],
    etape_validation_prt: ['approbation.prt'],
  };
  return (byPermission[stageCode] || []).map((perm, i) => ({
    type: 'role',
    id_reference: perm,
    ordre: i + 1,
    obligatoire: true,
  }));
}

/* ------------------------------------------------------------------ */
/*  Lecture du détail d'une version de workflow                        */
/* ------------------------------------------------------------------ */

/**
 * Charge une version complète : { id_version, numero, statut, date_publication, etapes[] }.
 * Chaque étape possède `approbateurs[]` (type/id_reference/ordre/obligatoire).
 * Retourne null si la version n'existe pas.
 */
async function loadWorkflowDetail(pool, idVersion) {
  const version = await pool
    .request()
    .input('idv', sql.Int, idVersion)
    .query(
      `SELECT v.id_version, v.id_workflow, v.numero, v.statut,
              v.date_creation, v.date_publication
         FROM [Workflow_Version] v
        WHERE v.id_version = @idv`
    );
  if (version.recordset.length === 0) return null;
  const v = version.recordset[0];

  const etapesRes = await pool
    .request()
    .input('idv', sql.Int, idVersion)
    .query(
      `SELECT e.id_etape, e.code, e.libelle, e.ordre, e.mode,
              e.strategie, e.min_decisions
         FROM [Workflow_Etape] e
        WHERE e.id_version = @idv
        ORDER BY e.ordre`
    );

  const etapes = [];
  for (const e of etapesRes.recordset) {
    const appr = await pool
      .request()
      .input('ide', sql.Int, e.id_etape)
      .query(
        `SELECT a.id_approbateur, a.type, a.id_reference, a.ordre, a.obligatoire
           FROM [Workflow_Etape_Approbateur] a
          WHERE a.id_etape = @ide
          ORDER BY a.ordre`
      );
    etapes.push({
      id_etape: e.id_etape,
      id_version: idVersion,
      code: e.code,
      libelle: e.libelle,
      ordre: e.ordre,
      mode: e.mode,
      strategie: e.strategie,
      min_decisions: e.min_decisions || 0,
      approbateurs: appr.recordset.map((a) => ({
        id_approbateur: a.id_approbateur,
        type: a.type,
        id_reference: a.id_reference,
        ordre: a.ordre,
        obligatoire: a.obligatoire === true || a.obligatoire === 1 || a.obligatoire === '1',
      })),
    });
  }

  return {
    id_version: v.id_version,
    id_workflow: v.id_workflow,
    numero: v.numero,
    statut: v.statut,
    date_creation: v.date_creation,
    date_publication: v.date_publication,
    etapes,
  };
}

/** Détail de la version publiée du workflow actif (ou null si aucune). */
async function getActiveWorkflow(pool) {
  const res = await pool.request().query(
    `SELECT TOP 1 v.id_version, c.id_workflow, c.code AS config_code
       FROM [Workflow_Config] c
       JOIN [Workflow_Version] v ON v.id_workflow = c.id_workflow
      WHERE c.actif = 1 AND v.statut = 'publiee'
      ORDER BY v.date_publication DESC`
  );
  if (res.recordset.length === 0) return null;
  return loadWorkflowDetail(pool, res.recordset[0].id_version);
}

/** Charge la version publiée (workflow courante), sans version -> null. */
async function getWorkflowCurrent(pool) {
  return getActiveWorkflow(pool);
}

/* ------------------------------------------------------------------ */
/*  Résolution des emails approbateurs                                 */
/* ------------------------------------------------------------------ */

/**
 * Emails des utilisateurs rattachés à une PERMISSION (ou à un RÔLE legacy).
 * Résolution : Permission.code = id_reference, sinon Roles.code = id_reference.
 */
async function resolveEmailsForPermission(pool, idReference) {
  const res = await pool
    .request()
    .input('ref', sql.NVarChar, idReference)
    .query(
      `SELECT DISTINCT LOWER(LTRIM(RTRIM(u.email))) AS email
         FROM [Utilisateurs] u
         JOIN [Utilisateur_Roles]   ur ON ur.id_user = u.rowid
         JOIN [Roles]               r  ON r.id_role = ur.id_role
         LEFT JOIN [Role_Permissions] rp ON rp.id_role = r.id_role
         LEFT JOIN [Permissions]    p  ON p.id_perm = rp.id_perm
        WHERE r.code = @ref
           OR (@ref IN (SELECT code FROM [Permissions]) AND p.code = @ref)
        ORDER BY email`
    );
  return res.recordset.map((x) => x.email).filter(Boolean);
}

/** Emails d'un approbateur d'étape (type 'email' → email direct). */
async function resolveApprobateurEmails(pool, approbateur) {
  if (approbateur.type === 'email') {
    const email = String(approbateur.id_reference || '').trim().toLowerCase();
    return email ? [email] : [];
  }
  return resolveEmailsForPermission(pool, approbateur.id_reference);
}

/** Union distincte des emails de tous les approbateurs d'une étape. */
async function resolveStageEmails(pool, stage) {
  const emails = new Set();
  for (const ap of stage.approbateurs || []) {
    const list = await resolveApprobateurEmails(pool, ap);
    for (const e of list) emails.add(e);
  }
  return [...emails];
}

/** Assigne à chaque approbateur d'étape son type d'approbation legacy. */
function legacyTypeFor(approbateur, stageCode) {
  if (TYPE_BY_PERM[approbateur.id_reference]) return TYPE_BY_PERM[approbateur.id_reference];
  return approbateur.id_reference; // email direct : le type legacy reste l'id_reference
}

/** Type d'approbation legacy → permission d'approbation (recherche par étape). */
function permForType(typeApprobation) {
  for (const [perm, type] of Object.entries(TYPE_BY_PERM)) {
    if (type === typeApprobation) return perm;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Réparation d'une demande dans le workflow                          */
/* ------------------------------------------------------------------ */

/**
 * Garantit qu'une demande possède une ligne Demande_Workflow (id_version = version publiée,
 * etape_courante = 'etape_validation', comportement historique de la création).
 */
async function ensureWorkflowRow(pool, numeroDemande) {
  const row = await pool
    .request()
    .input('nd', sql.Int, numeroDemande)
    .query(`SELECT * FROM [Demande_Workflow] WHERE id_demande = @nd`);
  if (row.recordset.length > 0) return row.recordset[0];

  const active = await getActiveWorkflow(pool);
  if (!active) return null;

  await insertRow('Demande_Workflow', {
    id_demande: numeroDemande,
    id_version: active.id_version,
    etape_courante: 'etape_validation',
    statut_decision: null,
  });
  return { id_demande: numeroDemande, id_version: active.id_version, etape_courante: 'etape_validation', statut_decision: null };
}

/** État courant (étage + version) d'une demande dans le workflow. */
async function getDemandeWorkflowState(pool, numeroDemande) {
  const row = await ensureWorkflowRow(pool, numeroDemande);
  if (!row) return null;
  const detail = await loadWorkflowDetail(pool, row.id_version);
  return { row, detail };
}

/* ------------------------------------------------------------------ */
/*  Décisions enregistrées pour une demande                            */
/* ------------------------------------------------------------------ */

/**
 * Décisions non vides d'une demande, groupées par email approbant :
 * Map<email, 'valide' | 'refus'>. Les lignes legacy dont la décision est un
 * code de type ('acceptation_…', 'approbation_…') sont comptées comme valide.
 */
async function decisionsForDemande(pool, numeroDemande) {
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numeroDemande))
    .query(
      `SELECT email_approbant, LTRIM(RTRIM(ISNULL(decision,''))) AS decision
         FROM [Approbation]
        WHERE numero_demande = @nd`
    );
  const map = new Map();
  for (const r of res.recordset) {
    const email = String(r.email_approbant || '').trim().toLowerCase();
    const d = String(r.decision || '').toLowerCase();
    if (!email || !d || d === 'non applicable' || d === 'nonapplicable' || d === 'n/a') continue;
    const isRefus = d.includes('refus') || d.includes('refuse');
    map.set(email, isRefus ? 'refus' : 'valide');
  }
  return map;
}

/**
 * Décisions d'une demande groupées par type d'approbation (slot d'étape) :
 * Map<type_approbation, 'valide' | 'refus'>. Un slot est satisfait dès qu'un
 * membre éligible a donné une décision pour ce type.
 */
async function decisionsByTypeForDemande(pool, numeroDemande) {
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numeroDemande))
    .query(
      `SELECT LTRIM(RTRIM(ISNULL(type_approbation,''))) AS type_approbation,
              LTRIM(RTRIM(ISNULL(decision,''))) AS decision
         FROM [Approbation]
        WHERE numero_demande = @nd`
    );
  const map = new Map();
  for (const r of res.recordset) {
    const type = String(r.type_approbation || '').trim();
    const d = String(r.decision || '').toLowerCase();
    if (!type || !d || d === 'non applicable' || d === 'nonapplicable' || d === 'n/a') continue;
    const isRefus = d.includes('refus') || d.includes('refuse');
    map.set(type, isRefus ? 'refus' : 'valide');
  }
  return map;
}

/**
 * Paires (type, email) déjà décidées pour une demande :
 * Map<type_approbation, Set<email>>. Une ligne legacy dont la décision est un
 * code de type ('acceptation_…', 'approbation_…') comptée comme valide.
 */
async function decidedPairsForDemande(pool, numeroDemande) {
  const res = await pool
    .request()
    .input('nd', sql.NVarChar, String(numeroDemande))
    .query(
      `SELECT LTRIM(RTRIM(ISNULL(type_approbation,''))) AS type_approbation,
              LTRIM(RTRIM(email_approbant)) AS email_approbant,
              LTRIM(RTRIM(ISNULL(decision,''))) AS decision
         FROM [Approbation]
        WHERE numero_demande = @nd`
    );
  const map = new Map();
  for (const r of res.recordset) {
    const type = String(r.type_approbation || '').trim();
    const email = String(r.email_approbant || '').trim().toLowerCase();
    const d = String(r.decision || '').toLowerCase();
    if (!type || !email || !d || d === 'non applicable' || d === 'nonapplicable' || d === 'n/a') continue;
    if (!map.has(type)) map.set(type, new Set());
    map.get(type).add(email);
  }
  return map;
}

/**
 * Nombre de slots (approbateurs exigés) d'une étape déjà satisfaits : un slot
 * est satisfait s'il existe une décision pour son type legacy, quel que soit le
 * membre éligible qui l'a donnée. Les approbateurs facultatifs ne comptent pas.
 */
async function satisfiedApprobeurSlots(pool, stage, decisionsByType) {
  let satisfied = 0;
  for (const ap of stage.approbateurs || []) {
    if (ap.obligatoire === false) continue;
    const type = legacyTypeFor(ap, stage.code);
    if (decisionsByType.has(type)) satisfied += 1;
  }
  return satisfied;
}

/**
 * Condition d'avancement satisfaite pour une étape (par approbateur/slot).
 * - 'tous'      : tous les approbateurs exigés de l'étape sont satisfaits.
 * - 'au_moins_un': au moins un approbateur exige est satisfait.
 * - 'majorite'  : au moins max(min_decisions, floor(n/2)+1) approbateurs exigés.
 */
function isStageSatisfiedSlots(stage, satisfiedSlots) {
  const n = (stage.approbateurs || []).filter((a) => a.obligatoire !== false).length;
  if (n === 0) return false; // étape sans approbateur exigé : on ne l'avance pas seul
  switch (stage.strategie) {
    case 'au_moins_un':
      return satisfiedSlots >= 1;
    case 'majorite': {
      const min = Math.max(stage.min_decisions || 0, Math.floor(n / 2) + 1);
      return satisfiedSlots >= min;
    }
    default:
      return satisfiedSlots >= n;
  }
}

/* ------------------------------------------------------------------ */
/*  Transition / clôture d'une demande                                 */
/* ------------------------------------------------------------------ */

async function writeHistorique(pool, user, action, numero, commentaire, numeroChrono) {
  try {
    await insertRow('historique', {
      utilisateur: user,
      action,
      page_source: 'Workflow',
      date: new Date(),
      commentaire: commentaire || '',
      numero_chronologique: numeroChrono ? String(numeroChrono) : null,
    });
  } catch (e) {
    console.error('[workflow] historique ignoré :', e.message);
  }
}

/**
 * Avance la demande vers la prochaine étape publiée (ou terminale sur refus).
 * Met à jour Demande.etat_demande, Demande_Workflow.etape_courante et
 * notifie le demandeur.
 */
async function applyTransition(pool, numeroDemande, target, decision, user) {
  const demande = await pool
    .request()
    .input('nd', sql.Int, numeroDemande)
    .query(`SELECT * FROM [Demande] WHERE numero_demande = @nd`);
  const demandeRow = demande.recordset[0];
  if (!demandeRow) return;

  const numeroChrono = demandeRow.numero_chronologique;

  if (target.code === 'etape_refusee') {
    await updateRow('Demande', 'numero_demande', numeroDemande, { etat_demande: 'refusée' });
    await updateRow('Demande_Workflow', 'id_demande', numeroDemande, {
      etape_courante: 'etape_refusee',
      statut_decision: 'refusée',
    });
    await writeHistorique(pool, user, 'refus', numeroDemande, 'Demande refusée par le workflow', numeroChrono);
    return { advanced: true, terminal: true, etape: 'etape_refusee', etat: 'refusée' };
  }

  if (target.code === 'etape_incomplete') {
    await updateRow('Demande', 'numero_demande', numeroDemande, { etat_demande: 'demande_incomplète' });
    await updateRow('Demande_Workflow', 'id_demande', numeroDemande, {
      etape_courante: 'etape_incomplete',
      statut_decision: 'demande_incomplète',
    });
    await writeHistorique(pool, user, 'incomplet', numeroDemande, 'Demande déclarée incomplète', numeroChrono);
    return { advanced: true, terminal: true, etape: 'etape_incomplete', etat: 'demande_incomplète' };
  }

  await updateRow('Demande', 'numero_demande', numeroDemande, {
    etat_demande: legacyLabelFor(target.code),
  });
  await updateRow('Demande_Workflow', 'id_demande', numeroDemande, {
    etape_courante: target.code,
    statut_decision: null,
  });
  await writeHistorique(
    pool,
    user,
    'transition',
    numeroDemande,
    `Avancement vers ${target.libelle || target.code}`,
    numeroChrono
  );
  return { advanced: true, terminal: false, etape: target.code, etat: legacyLabelFor(target.code) };
}

/**
 * Évalue l'étape courante d'une demande et déclenche l'avancement si la
 * condition de l'étape est satisfaite.
 * Retourne { advanced, terminal, etape, etat } — advanced=false si rien.
 */
async function evaluateStageAndAdvance(pool, numeroDemande, options = {}) {
  const state = await getDemandeWorkflowState(pool, numeroDemande);
  if (!state) return { advanced: false, message: 'Aucun workflow publié' };

  const { row, detail } = state;

  // Terminale : plus rien à évaluer.
  if (TERMINAL_CODES.has(row.etape_courante)) return { advanced: false, terminal: true, etape: row.etape_courante };

  const stage = detail.etapes.find((e) => e.code === row.etape_courante);
  if (!stage || (stage.approbateurs || []).length === 0) {
    // Étape sans approbateur (impact/implémentation/clôture) : pas d'auto-avancement.
    return { advanced: false, etape: row.etape_courante };
  }

  const decisions = await decisionsByTypeForDemande(pool, numeroDemande);
  const anyRefus = [...decisions.values()].some((d) => d === 'refus');

  // Un refus dans une stratégie 'tous'/'majorite' termine la demande (refusée).
  if (stage.strategie !== 'au_moins_un' && anyRefus) {
    return applyTransition(pool, numeroDemande, { code: 'etape_refusee' }, decisions, 'Système');
  }

  const satisfiedSlots = await satisfiedApprobeurSlots(pool, stage, decisions);
  if (!isStageSatisfiedSlots(stage, satisfiedSlots)) {
    return { advanced: false, etape: row.etape_courante };
  }

  // Avancement vers la prochaine étape définie dans la version.
  const next = detail.etapes
    .filter((e) => e.ordre > stage.ordre)
    .sort((a, b) => a.ordre - b.ordre)[0];
  if (!next) {
    // Dernière étape atteinte (clôture).
    return applyTransition(pool, numeroDemande, { code: 'etape_cloturee' }, decisions, 'Système');
  }
  return applyTransition(pool, numeroDemande, next, decisions, 'Système');
}

/* ------------------------------------------------------------------ */
/*  File des approbations en attente                                   */
/* ------------------------------------------------------------------ */

/**
 * Construit la liste des entrées « approbation en attente » pour toutes les
 * demandes du workflow publié. Chaque entrée possède la demande complète et
 * un objet approbation pré-rempli (type legacy, email, statut vide).
 */
async function getPendingApprovals(pool) {
  const active = await getActiveWorkflow(pool);
  if (!active) return [];

  const demandes = await pool.request().query(
    `SELECT d.*, LOWER(LTRIM(RTRIM(u.email))) AS lower_demandeur,
            ISNULL(dw.etape_courante, '') AS etape_courante,
            ISNULL(dw.statut_decision, '') AS statut_decision
       FROM [Demande] d
       LEFT JOIN [Demande_Workflow] dw ON dw.id_demande = d.numero_demande
       LEFT JOIN [Utilisateurs] u ON u.email = d.demandeur
      WHERE dw.etape_courante IS NOT NULL
      ORDER BY d.numero_demande DESC`
  );

  const pending = [];
  for (const raw of demandes.recordset) {
    const etat = String(raw.etat_demande || '').trim().toLowerCase();
    if (ETAT_TERMINAUX.has(etat)) continue;

    // Réparation automatique : étape absente du workflow courant → re-seed.
    const stageCode = raw.etape_courante;
    let stage = active.etapes.find((e) => e.code === stageCode);
    if (!stage) {
      await ensureWorkflowRow(pool, raw.numero_demande);
      stage = active.etapes.find((e) => e.code === 'etape_validation');
      if (!stage) continue;
    }
    if ((stage.approbateurs || []).length === 0) continue;

    const decisions = await decidedPairsForDemande(pool, raw.numero_demande);
    const rows = await toDtoRows('Demande', [raw]);

    for (const ap of stage.approbateurs) {
      const emails = await resolveApprobateurEmails(pool, ap);
      const type = legacyTypeFor(ap, stage.code);
      const decidedEmails = decisions.get(type);
      if (decidedEmails && decidedEmails.size > 0) continue; // slot déjà satisfait
      for (const email of emails) {
        pending.push({
          demande: rows[0],
          etape: stage.code,
          approbation: {
            numero_demande: Number(raw.numero_demande),
            type_approbation: type,
            email_approbant: email,
            decision: '',
            commentaire: '',
            Date_approbation: null,
            id_approbation: 0,
          },
        });
      }
    }
  }
  return pending;
}

/**
 * Soumission d'une décision d'approbation (legacy) puis resynchronisation du
 * workflow. Retourne { success, message, nouvelleApprobation, transition }.
 */
async function submitApproval(pool, payload) {
  const numero = Number(payload.numero_demande);
  const typeAppro = String(payload.type_approbation || '');
  const email = String(payload.email_approbant || '').trim().toLowerCase();
  const decision = String(payload.decision || '');
  const commentaire = String(payload.commentaire || '');
  const markIncomplete = Boolean(payload.markIncomplete);

  const dm = await pool.request().input('nd', sql.Int, numero).query(`SELECT * FROM [Demande] WHERE numero_demande = @nd`);
  const demande = dm.recordset[0];
  if (!demande) throw Object.assign(new Error('Demande introuvable'), { status: 404 });

  const state = await getDemandeWorkflowState(pool, numero);
  if (!state) {
    throw Object.assign(new Error('Aucun workflow publié pour cette demande'), { status: 409 });
  }

  let decisionFinale = decision || 'NON APPLICABLE';

  if (markIncomplete) {
    decisionFinale = 'NON APPLICABLE';
    const inserted = await insertRow('Approbation', {
      numero_demande: String(numero),
      type_approbation: typeAppro || 'acceptation_coordinateur_changement',
      email_approbant: email,
      decision: decisionFinale,
      commentaire: commentaire || 'Demande déclarée incomplète',
      Date_approbation: markIncomplete ? '' : new Date().toLocaleString('fr-FR'),
    });
    const transition = await evaluateStageAndAdvanceWithTarget(pool, numero, 'etape_incomplete');
    return {
      success: false,
      message: 'Demande marquée comme incomplète.',
      nouvelleApprobation: buildApprovalDto(inserted, numero, typeAppro, email, decisionFinale, commentaire),
      transition,
    };
  }

  if (!decisionFinale) {
    throw Object.assign(new Error('Décision requise (valide, refusée ou NON APPLICABLE)'), { status: 400 });
  }

  // Garde anti-doublon : un approbateur ne peut donner sa décision qu'une fois
  // par type d'approbation (empêche le spam de décisions identiques).
  const dup = await pool
    .request()
    .input('nd', sql.Int, numero)
    .input('ta', sql.NVarChar, typeAppro)
    .input('em', sql.NVarChar, email)
    .query(
      `SELECT TOP 1 numero_approbation
         FROM [Approbation]
        WHERE numero_demande = @nd
          AND LTRIM(RTRIM(type_approbation)) = @ta
          AND LTRIM(RTRIM(LOWER(email_approbant))) = @em
          AND LTRIM(RTRIM(ISNULL(decision, ''))) <> ''`
    );
  if (dup.recordset[0]) {
    throw Object.assign(new Error('Cet approbateur a déjà donné sa décision pour cette étape.'), { status: 409 });
  }

  // Enregistre la décision.
  const inserted = await insertRow('Approbation', {
    numero_demande: String(numero),
    type_approbation: typeAppro || legacyTypeFor({ id_reference: typeAppro }, state.row.etape_courante),
    email_approbant: email,
    decision: decisionFinale,
    commentaire,
    Date_approbation: new Date().toLocaleString('fr-FR'),
  });

  // Resynchronise le workflow.
  const transition = await evaluateStageAndAdvance(pool, numero, {
    stageCode: state.row.etape_courante,
    submittedType: typeAppro,
    submittedEmail: email,
  });

  return {
    success: true,
    message:
      transition && transition.advanced
        ? transition.terminal
          ? `Demande ${transition.etat}.`
          : 'Approbation enregistrée — la demande a avancé dans le workflow.'
        : 'Approbation enregistrée.',
    nouvelleApprobation: buildApprovalDto(inserted, numero, typeAppro, email, decisionFinale, commentaire),
    transition,
  };
}

/** Transition forcée vers une étape terminale (incomplète / refusée). */
async function evaluateStageAndAdvanceWithTarget(pool, numero, targetCode) {
  if (targetCode === 'etape_incomplete') {
    return applyTransition(pool, numero, { code: 'etape_incomplete' }, null, 'Système');
  }
  if (targetCode === 'etape_refusee') {
    return applyTransition(pool, numero, { code: 'etape_refusee' }, null, 'Système');
  }
  return evaluateStageAndAdvance(pool, numero);
}

/** DTO d'une approbation insérée (aligné sur le contrat Approbation). */
function buildApprovalDto(inserted, numero, type, email, decision, commentaire) {
  return {
    numero_approbation: inserted.idValue,
    numero_demande: numero,
    type_approbation: type,
    email_approbant: email,
    decision,
    commentaire,
    Date_approbation: new Date().toLocaleString('fr-FR'),
  };
}

module.exports = {
  TYPE_BY_PERM,
  APPROBATION_PERMS,
  LEGACY_LABEL,
  TERMINAL_CODES,
  ETAT_TERMINAUX,
  defaultStages,
  defaultApprobateurs,
  loadWorkflowDetail,
  getActiveWorkflow,
  getWorkflowCurrent,
  resolveEmailsForPermission,
  resolveApprobateurEmails,
  resolveStageEmails,
  legacyTypeFor,
  permForType,
  ensureWorkflowRow,
  getDemandeWorkflowState,
  decisionsForDemande,
  isStageSatisfiedSlots,
  evaluateStageAndAdvance,
  getPendingApprovals,
  submitApproval,
};