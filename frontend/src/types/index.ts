/**
 * Types et interfaces pour l'application Medicis Change Control (GxP).
 * Aligné COLONNE PAR COLONNE avec le schéma fixe de la base SQL Server DCMEDICIS
 * (référence : documentation_recreation/02_architecture_base_donnees.md).
 * Le schéma ne doit PAS être modifié : les champs marqués "frontend" sont
 * calculés par l'application et ne sont pas persistés dans DCMEDICIS.
 */

/* ------------------------------------------------------------------------ */
/*  WORKFLOW (identique au legacy, gère le bug des espaces en tête)          */
/* ------------------------------------------------------------------------ */

export type WorkflowState =
  | 'demande_éditée'
  | 'acceptation_coordinateur_changement'
  | 'acceptation_responsable_service'
  | 'acceptation_chargé_changement'
  | 'acceptation_responsable_changement'
  | 'approbation_directeur_qualité'
  | 'approbation_PRT'
  | 'Demande de changement Impact défini'
  | 'Demande de changement en cours'
  | 'clôturée_validée'
  | 'refusée'
  | 'demande_incomplète';

export function normalizeWorkflowState(rawState: string | undefined | null): WorkflowState {
  if (!rawState) return 'demande_éditée';
  const trimmed = rawState.trim();
  switch (trimmed) {
    case 'demande_éditée':
    case 'demande_editee':
      return 'demande_éditée';
    case 'acceptation_coordinateur_changement':
      return 'acceptation_coordinateur_changement';
    case 'acceptation_responsable_service':
      return 'acceptation_responsable_service';
    case 'acceptation_chargé_changement':
    case 'acceptation_charge_changement':
      return 'acceptation_chargé_changement';
    case 'acceptation_responsable_changement':
      return 'acceptation_responsable_changement';
    case 'approbation_directeur_qualité':
    case 'approbation_directeur_qualite':
      return 'approbation_directeur_qualité';
    case 'approbation_PRT':
    case 'approbation_prt':
      return 'approbation_PRT';
    case 'Demande de changement Impact défini':
    case 'Demande de changement Impact defini':
      return 'Demande de changement Impact défini';
    case 'Demande de changement en cours':
      return 'Demande de changement en cours';
    case 'clôturée_validée':
    case 'cloturee_validee':
      return 'clôturée_validée';
    case 'refusée':
    case 'refusee':
      return 'refusée';
    case 'demande_incomplète':
    case 'demande_incomplete':
      return 'demande_incomplète';
    default:
      return trimmed as WorkflowState;
  }
}

export const WORKFLOW_LABELS: Record<WorkflowState, string> = {
  'demande_éditée': 'Demande éditée (Brouillon / Initialisation)',
  'acceptation_coordinateur_changement': 'Acceptation Coordinateur Changement',
  'acceptation_responsable_service': 'Acceptation Responsable Service N+1',
  'acceptation_chargé_changement': 'Acceptation Chargé de Changement',
  'acceptation_responsable_changement': 'Acceptation Responsable Changement',
  'approbation_directeur_qualité': 'Approbation Directeur Qualité (QA)',
  'approbation_PRT': 'Approbation Comité PRT',
  'Demande de changement Impact défini': 'Impacts Définis & Analysés',
  'Demande de changement en cours': 'Changement en Cours d\'Exécution',
  'clôturée_validée': 'Clôturée & Validée',
  'refusée': 'Refusée',
  'demande_incomplète': 'Demande Incomplète (Complément requis)',
};

export interface WorkflowStepInfo {
  index: number;
  label: string;
  shortLabel: string;
  role: string;
}

export const WORKFLOW_PIPELINE: WorkflowStepInfo[] = [
  { index: 1, label: 'Création & Édition', shortLabel: 'Création', role: 'Demandeur' },
  { index: 2, label: 'Validation Hiérarchique N+1', shortLabel: 'N+1', role: 'Responsable de Service' },
  { index: 3, label: 'Direction Assurance Qualité', shortLabel: 'Dir. QA', role: 'Directeur Qualité' },
  { index: 4, label: 'Revue Comité PRT', shortLabel: 'PRT', role: 'Comité PRT' },
  { index: 5, label: 'Évaluation des Impacts Métiers', shortLabel: 'Impacts', role: 'Services Impactés' },
  { index: 6, label: 'Mise en Œuvre & Clôture', shortLabel: 'Clôture', role: 'Assurance Qualité' },
];

export const WORKFLOW_STATUTS: WorkflowState[] = [
  'demande_éditée',
  'acceptation_coordinateur_changement',
  'acceptation_responsable_service',
  'acceptation_chargé_changement',
  'acceptation_responsable_changement',
  'approbation_directeur_qualité',
  'approbation_PRT',
  'Demande de changement Impact défini',
  'Demande de changement en cours',
  'clôturée_validée',
  'refusée',
  'demande_incomplète',
];

/* ------------------------------------------------------------------------ */
/*  PERMISSIONS : colonne `Utilisateurs.Accees` (22 positions 0-based)       */
/* ------------------------------------------------------------------------ */

export const ACCEES_LENGTH = 22;

export interface AcceesDefinition {
  position: number;
  label: string;
  page?: string;
  kind: 'flag' | 'site' | 'role_special';
}

export const ACCEES_DEFINITIONS: AcceesDefinition[] = [
  { position: 0, label: 'Accès de base', kind: 'flag' },
  { position: 1, label: 'Créer une demande', page: 'Demande.aspx', kind: 'flag' },
  { position: 2, label: 'Responsable hiérarchique (service)', page: 'dem_att_resph.aspx', kind: 'flag' },
  { position: 3, label: 'Chargé de changement', page: 'dem_att_charge.aspx', kind: 'flag' },
  { position: 4, label: 'Responsable changement', page: 'dem_att_resp_chang.aspx', kind: 'flag' },
  { position: 5, label: 'PRT (comité)', page: 'dem_att_prt.aspx', kind: 'flag' },
  { position: 6, label: 'Consultation / Recherche', page: 'ConsultationetRecherche.aspx', kind: 'flag' },
  { position: 7, label: 'Plans d\'action', page: 'Plan_Action.aspx', kind: 'flag' },
  { position: 8, label: 'Évaluation / Clôture', page: 'Evaluation_Colture.aspx', kind: 'flag' },
  { position: 9, label: 'Réunions', page: 'Reunions.aspx', kind: 'flag' },
  { position: 10, label: 'Paramétrage mailing', page: 'Parametrage_mailing.aspx', kind: 'flag' },
  { position: 11, label: 'Paramétrages', page: 'Parametrages.aspx', kind: 'flag' },
  { position: 12, label: '(réservé)', kind: 'flag' },
  { position: 13, label: 'Gestion utilisateurs', page: 'utilisateurs.aspx', kind: 'flag' },
  { position: 14, label: 'Avis / Actions services', page: 'Avis_Actions_Services.aspx', kind: 'flag' },
  { position: 15, label: 'Historique', page: 'Historique.aspx', kind: 'flag' },
  { position: 16, label: 'Sites (chargé)', kind: 'site' },
  { position: 17, label: 'Sites (responsable) + liste approbateurs', page: 'Liste_Approbateurs.aspx', kind: 'site' },
  { position: 18, label: 'Rôle spécial (Compliance / Réglementaire / PV)', kind: 'role_special' },
  { position: 19, label: 'Sites (plan d\'action)', kind: 'site' },
  { position: 20, label: 'Sites (clôture)', kind: 'site' },
  { position: 21, label: 'Sites (validation PRT)', kind: 'site' },
];

/** Codification des sites (0=SS, 1=JO, 2=EF, 3=JO+EF) */
export type SiteCode = 0 | 1 | 2 | 3;

export const SITE_CODES_LABELS: Record<number, string> = {
  0: 'SS (Siège Social)',
  1: 'JO (site JO)',
  2: 'EF (site EF)',
  3: 'JO + EF (les deux sites)',
};

/** Rôle spécial : Accees[18] */
export const ROLE_SPECIAL_LABELS: Record<number, string> = {
  0: 'Aucun',
  2: 'Compliance',
  3: 'Réglementaire',
  4: 'Pharmacovigilance (PV)',
};

/**
 * Permissions déchiffrées de la chaîne binaire `Accees`.
 * Les indicateurs issus des colonnes `DirecteurAQ` / `MemberAQ` sont fournis
 * par l'application au moment du parse (voir AuthContext).
 */
export interface UserPermissions {
  acces_base: boolean;
  peut_creer_demande: boolean;
  peut_valider_hierarchie: boolean;
  peut_valider_charge_changement: boolean;
  peut_valider_responsable_changement: boolean;
  peut_valider_prt: boolean;
  peut_consulter: boolean;
  peut_plans_action: boolean;
  peut_evaluation_cloture: boolean;
  peut_reunions: boolean;
  peut_parametrage_mailing: boolean;
  peut_parametrages: boolean;
  peut_gestion_utilisateurs: boolean;
  peut_avis_services: boolean;
  peut_historique: boolean;
  sites_charge: number;
  sites_responsable: number;
  role_special: number;
  sites_plan_action: number;
  sites_cloture: number;
  sites_validation_prt: number;

  // Flags QA (colonnes Utilisateurs, hors Accees)
  est_directeur_qa: boolean;
  est_membre_qa: boolean;

  // Convenience dérivés (pour compatibilité des écrans existants)
  peut_valider_qualite: boolean;
  peut_valider_qualite_prt: boolean;
  peut_cloturer_changement: boolean;
  peut_evaluer_impacts: boolean;
  peut_administrer: boolean;
  peut_exporter_donnees: boolean;
}

/** Découpe sécurisée d'une chaîne Accees (tolère < 22 ou > 22 positions). */
export function getAcceesChar(accees: string | undefined | null, position: number): '1' | '0' {
  if (!accees) return '0';
  if (position > ACCEES_LENGTH) return '0';
  if (position < accees.length) return accees[position] === '1' ? '1' : '0';
  return '0';
}

export function parseAccees(
  accees?: string | null,
  opts?: { DirecteurAQ?: unknown; MemberAQ?: unknown }
): UserPermissions {
  const flag = (p: number) => getAcceesChar(accees, p) === '1';
  const site = (p: number): number => Number(getAcceesChar(accees, p)) as SiteCode;
  const roleSpecial = Number(getAcceesChar(accees, 18)) as 0 | 2 | 3 | 4;

  const estDirecteurQA = Boolean(opts?.DirecteurAQ && String(opts.DirecteurAQ) !== '0');
  const estMembreQA = Boolean(opts?.MemberAQ && String(opts.MemberAQ) !== '0');

  const peutEvaluerImpacts = flag(14) || flag(8);
  return {
    acces_base: flag(0),
    peut_creer_demande: flag(1),
    peut_valider_hierarchie: flag(2),
    peut_valider_charge_changement: flag(3),
    peut_valider_responsable_changement: flag(4),
    peut_valider_prt: flag(5),
    peut_consulter: flag(6),
    peut_plans_action: flag(7),
    peut_evaluation_cloture: flag(8),
    peut_reunions: flag(9),
    peut_parametrage_mailing: flag(10),
    peut_parametrages: flag(11),
    peut_gestion_utilisateurs: flag(13),
    peut_avis_services: flag(14),
    peut_historique: flag(15),
    sites_charge: site(16),
    sites_responsable: site(17),
    role_special: roleSpecial,
    sites_plan_action: site(19),
    sites_cloture: site(20),
    sites_validation_prt: site(21),

    est_directeur_qa: estDirecteurQA,
    est_membre_qa: estMembreQA,

    peut_valider_qualite: estDirecteurQA,
    peut_valider_qualite_prt: estDirecteurQA || flag(5),
    peut_cloturer_changement: flag(8) || estMembreQA,
    peut_evaluer_impacts: peutEvaluerImpacts,
    peut_administrer: flag(13),
    peut_exporter_donnees: flag(6),
  };
}

/** Reconstruction d'une chaîne Accees de 22 positions depuis un objet partiel. */
export function buildAccees(perms: Partial<UserPermissions> | string[]): string {
  const arr = Array.from({ length: ACCEES_LENGTH }, () => '0');
  const set = (pos: number, truthy: unknown) => {
    if (truthy) arr[pos] = '1';
  };
  const setSite = (pos: number, code: unknown) => {
    const n = Number(code);
    if (!Number.isNaN(n) && n > 0 && n <= 3) arr[pos] = String(n);
  };

  if (Array.isArray(perms)) {
    perms.forEach((v, i) => {
      if (i < ACCEES_LENGTH && v === '1') arr[i] = '1';
    });
    return arr.join('');
  }

  set(0, perms.acces_base);
  set(1, perms.peut_creer_demande);
  set(2, perms.peut_valider_hierarchie);
  set(3, perms.peut_valider_charge_changement);
  set(4, perms.peut_valider_responsable_changement);
  set(5, perms.peut_valider_prt);
  set(6, perms.peut_consulter);
  set(7, perms.peut_plans_action);
  set(8, perms.peut_evaluation_cloture);
  set(9, perms.peut_reunions);
  set(10, perms.peut_parametrage_mailing);
  set(11, perms.peut_parametrages);
  set(13, perms.peut_gestion_utilisateurs);
  set(14, perms.peut_avis_services);
  set(15, perms.peut_historique);
  setSite(16, perms.sites_charge);
  setSite(17, perms.sites_responsable);
  const roleSpecial = Number(perms.role_special);
  if ([2, 3, 4].includes(roleSpecial)) arr[18] = String(roleSpecial);
  setSite(19, perms.sites_plan_action);
  setSite(20, perms.sites_cloture);
  setSite(21, perms.sites_validation_prt);

  return arr.join('');
}

export const encodeAccees = buildAccees;

/* ------------------------------------------------------------------------ */
/*  PERMISSIONS SERVEUR (Phase C) : `/auth/me` et `/auth/login`              */
/*  La source de vérité est la table RBAC côté serveur ; `Accees` n'est plus   */
/*  utilisé au runtime (conservé pour dépannage/export).                      */
/* ------------------------------------------------------------------------ */

/** Codes de permission tels que définis dans `backend/src/rbac.js`. */
export type PermissionCode = string;

/** Convertit une valeur site ('SS'|'JO'|'EF'|'JOF') en code SiteCode (0..3). */
export function siteLabelToCode(site: string | null | undefined): number {
  switch ((site || '').toUpperCase().trim()) {
    case 'JO': return 1;
    case 'EF': return 2;
    case 'JOF': return 3;
    case '': 
    case 'SS':
    default: return 0;
  }
}

/**
 * Construit un `UserPermissions` à partir des codes de permission renvoyés
 * par le serveur (RBAC). Remplace `parseAccees` au runtime (C5).
 */
export function parseServerPermissions(
  codes?: ReadonlyArray<string>,
  siteAccess?: Record<string, string>
): UserPermissions {
  const has = (code: string) => !!codes && codes.includes(code);
  const site = (permCode: string) => siteLabelToCode(siteAccess?.[permCode] ?? '');

  const estDirecteurQA = has('qa.directeur') || has('approbation.directeur_qualite');
  const estMembreQA = has('qa.membre');

  const base: UserPermissions = {
    acces_base: has('acces.base'),
    peut_creer_demande: has('demande.creer'),
    peut_valider_hierarchie: has('approbation.responsable_service'),
    peut_valider_charge_changement: has('approbation.charge_changement'),
    peut_valider_responsable_changement: has('approbation.responsable_changement'),
    peut_valider_prt: has('approbation.prt'),
    peut_consulter: has('consultation'),
    peut_plans_action: has('plan_action'),
    peut_evaluation_cloture: has('evaluation_cloture'),
    peut_reunions: has('reunions'),
    peut_parametrage_mailing: has('parametrage_mailing'),
    peut_parametrages: has('parametrages'),
    peut_gestion_utilisateurs: has('admin.utilisateurs'),
    peut_avis_services: has('avis_services'),
    peut_historique: has('historique'),
    sites_charge: site('site.charge'),
    sites_responsable: site('site.responsable'),
    role_special: has('role.compliance') ? 2 : has('role.reglementaire') ? 3 : has('role.pharmacovigilance') ? 4 : 0,
    sites_plan_action: site('site.plan_action'),
    sites_cloture: site('site.cloture'),
    sites_validation_prt: site('site.validation_prt'),
    est_directeur_qa: estDirecteurQA,
    est_membre_qa: estMembreQA,
    peut_valider_qualite: estDirecteurQA,
    peut_valider_qualite_prt: estDirecteurQA || has('approbation.prt'),
    peut_cloturer_changement: has('evaluation_cloture') || estMembreQA,
    peut_evaluer_impacts: has('avis_services') || has('evaluation_cloture'),
    peut_administrer: has('admin.utilisateurs'),
    peut_exporter_donnees: has('consultation'),
  };
  return base;
}

/** AuthSession enrichie par `/auth/me` / `/auth/login` (Phase C). */
export interface AuthSessionInfo {
  permissions: string[];
  roles: string[];
  siteAccess: Record<string, string>;
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Utilisateurs` (email = identifiant de connexion)                  */
/* ------------------------------------------------------------------------ */

export interface Utilisateur {
  id_user: number;
  email: string;
  password?: string;
  prenom: string;
  nom: string;
  service: string;
  fonction: string;
  signataire: string | null;
  Accees: string;
  Site: string;
  DirecteurAQ: boolean;
  MemberAQ: boolean;
  Role_user: string;
  est_actif?: boolean; // Flag d'interface (non présent dans DCMEDICIS)
  derniere_connexion?: string;
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Demande` (table centrale)                                         */
/* ------------------------------------------------------------------------ */

export interface Demande {
  numero_demande: number;
  numero_chronologique: string; // 'YY/NNN'
  demandeur: string; // email du demandeur
  etat_demande: string; // workflow state (peut avoir un espace en tête)
  sujet_changement: string;
  designation: string; // concaténée avec '-'
  codes: string; // concaténée avec '-'
  date_edition: string; // 'dd/MM/yyyy'
  date_reception?: string | null;
  date_souhaite_mep_changement: string;
  service_demandeur: string;
  type_changement: string; // référentiel Tab_Divers (parametre='type')
  site: string; // JO | EF | SS | JO + EF
  etat_actuel: string;
  description_changement: string;
  avantages_attendu: string;
  ressource_necessaire: string;
  classement_changement: string;
  produit_bailleur_licence_impactees: string;
  impact_produit_bailleur_licenece: string;
  cloturer: boolean;
  date_clôture?: string | null;
  commentaire_cloture_charge_changement?: string | null;
  Action_Qualipro?: string | null;
  nbr_reponse_services: number;

  // --- Champs d'affichage (frontend uniquement, dérivés, non persistés) ---
  nom_demandeur?: string;
  pieces_jointes_count?: number;
}

export type NiveauUrgence = 'Urgent' | 'Standard' | 'Faible';

/** Classe de criticité ≤> urgence (affichage). Valeurs typiques : Standard, Urgent, Faible. */
export const CLASSEMENT_LABELS: Record<string, string> = {
  Standard: 'Standard (délai normal)',
  Urgent: 'Urgent (risque approvisionnement)',
  Faible: 'Faible (amélioration continue)',
};

/* ------------------------------------------------------------------------ */
/*  TABLE `Sujet_Demande` (une demande peut avoir plusieurs sujets)          */
/* ------------------------------------------------------------------------ */

export interface SujetDemande {
  numero_demande: number;
  Sujet: string;
  Designation: string;
  Code_ou_indexation: string;
  id_sujet?: number; // frontend
}

export interface SujetDemandeProvisoire {
  Sujet: string;
  Designation: string;
  Code_ou_indexation: string;
  id_prov?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Approbation`                                                      */
/* ------------------------------------------------------------------------ */

export type TypeApprobation =
  | 'acceptation_coordinateur_changement'
  | 'acceptation_responsable_service'
  | 'acceptation_chargé_changement'
  | 'acceptation_responsable_changement'
  | 'approbation_directeur_qualité'
  | 'approbation_PRT';

export type DecisionApprobation = 'valide' | 'refusée' | 'NON APPLICABLE' | '';

export const DECISION_LABELS: Record<DecisionApprobation, string> = {
  valide: 'Validé',
  refusée: 'Refusé',
  'NON APPLICABLE': 'Non applicable',
  '': 'En attente',
};

export interface Approbation {
  numero_demande: number;
  type_approbation: TypeApprobation;
  email_approbant: string; // le nom est extrait en retirant le domaine '@xxx.com'
  decision: DecisionApprobation;
  commentaire: string;
  Date_approbation: string | null; // vide si NON APPLICABLE
  id_approbation?: number; // frontend
}

export const TYPE_APPROBATION_LABELS: Record<TypeApprobation, string> = {
  acceptation_coordinateur_changement: 'Coordinateur de changement',
  acceptation_responsable_service: 'Responsable de service (N+1)',
  acceptation_chargé_changement: 'Chargé de changement',
  acceptation_responsable_changement: 'Responsable de changement',
  approbation_directeur_qualité: 'Directeur Qualité (QA)',
  approbation_PRT: 'Comité PRT',
};

/* ------------------------------------------------------------------------ */
/*  TABLE `Service_impactees` (fautes de frappe conservées)                  */
/* ------------------------------------------------------------------------ */

export interface ServiceImpacte {
  numero_demande: number;
  service: string;
  email_cancernee: string; // volontairement avec la faute de frappe du schéma
  fonction: string;
  reponse: string; // 'oui' = répondu, toute autre valeur = en attente
  date_reponse: string | null;
  commentaire: string;
  Intervenant: string;
  id_impact?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Approb_Fonction`                                                  */
/* ------------------------------------------------------------------------ */

export interface ApprobFonction {
  Nom_Fonction: string;
  Type: string;
  id_approb_fonction?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Plan_actions` (lien Qualipro)                                     */
/* ------------------------------------------------------------------------ */

export type StatutPlanAction = 'en_cours' | 'terminée' | 'en_retard';

export const PLAN_ACTION_STATUT_LABELS: Record<StatutPlanAction, string> = {
  en_cours: 'En cours',
  terminée: 'Terminée',
  en_retard: 'En retard',
};

export interface PlanAction {
  numero_demande: number;
  action_description: string;
  responsable: string; // email du responsable
  delai: string | null; // date limite
  statut: StatutPlanAction;
  action_qualipro: string | null;
  date_creation: string;
  date_modification: string;
  id_plan_action?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Reunion`                                                          */
/* ------------------------------------------------------------------------ */

export interface Reunion {
  date_reunion: string;
  lieu: string;
  ordre_du_jour: string;
  participants: string;
  compte_rendu: string;
  demandes_discutees: string;
  date_creation: string;
  id_reunion?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Diffusions`                                                       */
/* ------------------------------------------------------------------------ */

export interface Diffusion {
  Num_Dem: number;
  Email: string;
  Date_Diffusion: string;
  id_diffusion?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Notifications` (ROWID desc, 8 dernières non lues)                 */
/* ------------------------------------------------------------------------ */

export interface NotificationItem {
  ROWID: number;
  titre: string;
  date: string;
  lien: string; // URL relative vers la page concernée
  email_concerne: string;
  etat_lecture: '0' | '1';
  // Convenience frontend dérivée du champ lien
  id_demande?: number;
}

/** Extrait l'éventuel numero_demande présent dans `lien` (ex: '/demandes/1001'). */
export function getDemandeIdFromLien(lien?: string): number | undefined {
  if (!lien) return undefined;
  const m = lien.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

/* ------------------------------------------------------------------------ */
/*  TABLE `mailing`                                                          */
/* ------------------------------------------------------------------------ */

export interface MailItem {
  numero_demande: number;
  email: string;
  message: string;
  frequence: string; // 'Semaine' par défaut
  date_creation_mailing: string;
  reponse: string; // 'non' défaut / 'oui'
  numero_chronologique: string;
  dernier_envoi: string | null;
  frequence_par_jour: string; // '30' par défaut
  etat_demande: string;
  reponse_service: string;
  id_mail?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `Tab_Divers` (référentiel générique)                               */
/* ------------------------------------------------------------------------ */

export type ParametreTabDivers = 'site' | 'type' | 'produit' | 'fonction' | 'service';

export interface TabDiversItem {
  parametre: ParametreTabDivers | string;
  designation: string;
  code: string;
  id_tab_divers?: number; // frontend
}

export interface ProduitReferentiel {
  code: string;
  designation: string;
}

/* ------------------------------------------------------------------------ */
/*  TABLE `historique` (journal d'audit global)                              */
/* ------------------------------------------------------------------------ */

export interface HistoriqueAudit {
  utilisateur: string; // format 'prenom.nom'
  action: string;
  page_source: string;
  date: string;
  commentaire: string;
  numero_chronologique: string;
  id_historique?: number; // frontend
}

/* ------------------------------------------------------------------------ */
/*  TABLE `serveur` (configuration, une seule ligne)                         */
/* ------------------------------------------------------------------------ */

export interface ParametresServeur {
  Serv: string; // URL de base du serveur
}

/* Pièces jointes (stockage fichier — pas de table dédiée dans DCMEDICIS) */
export interface AttachmentItem {
  id: string;
  nom_fichier: string;
  taille_octets: number;
  type_mime: string;
  date_upload: string;
  televerse_par: string;
  categorie: 'Protocole' | 'Rapport d\'impact' | 'Fiche de sécurité' | 'Schéma technique' | 'Autre';
}

/* ------------------------------------------------------------------------ */
/*  RBAC — Rôles & permissions (Phase C, tables `Roles`/`Permissions`)       */
/* ------------------------------------------------------------------------ */

export interface RolePermissionRef {
  code: string;
  libelle: string;
  module: string;
  site_code: string | null;
}

export interface RoleItem {
  id_role: number;
  code: string;
  libelle: string;
  nb_users: number;
  permissions: RolePermissionRef[];
}

export interface PermissionItem {
  id_perm: number;
  code: string;
  libelle: string;
  module: string;
}

export interface UserRoleItem {
  id_role: number;
  code: string;
  libelle: string;
}

/* ------------------------------------------------------------------------ */
/*  Workflow configurable (Phase B, tables `Workflow_*`/`Demande_Workflow`)  */
/* ------------------------------------------------------------------------ */

export type WorkflowStrategie = 'tous' | 'au_moins_un' | 'majorite';
export type WorkflowModeEtape = 'sequence' | 'parallele';
export type WorkflowApprobateurType = 'role' | 'email' | 'fonction' | 'service';

export interface WorkflowEtapeApprobateur {
  id_approbateur: number;
  type: 'email' | 'role';
  id_reference: string;
  ordre: number;
  obligatoire: number;
}

/** Saisie d'un approbateur lors de la configuration d'une étape (pas encore persisté). */
export type WorkflowApprobateurInput = Omit<WorkflowEtapeApprobateur, 'id_approbateur'>;

export interface WorkflowEtape {
  id_etape: number;
  code: string;
  libelle: string;
  ordre: number;
  mode: WorkflowModeEtape;
  strategie: WorkflowStrategie;
  min_decisions: number;
  approbateurs: WorkflowEtapeApprobateur[];
}

export interface WorkflowDetail {
  id_version: number;
  numero: number;
  statut: 'brouillon' | 'publiee';
  date_publication: string | null;
  etapes: WorkflowEtape[];
  etapeByCode?: Record<string, WorkflowEtape>;
}

export interface WorkflowVersionSummary {
  id_version: number;
  id_workflow: number;
  numero: number;
  statut: 'brouillon' | 'publiee';
  date_publication: string | null;
}

export interface WorkflowConfig {
  id_workflow: number;
  code: string;
  libelle: string;
  actif: number | boolean | null;
  versions?: WorkflowVersionSummary[];
}

export interface WorkflowAdminBundle {
  configs: WorkflowConfig[];
  active: WorkflowDetail | null;
}

/* ------------------------------------------------------------------------ */
/*  File d'approbation parallèle (Phase B, `/approbations/en-attente`)       */
/* ------------------------------------------------------------------------ */

export interface PendingApproval {
  demande: Demande;
  /** Code d'étape du moteur (chemin dynamique) ; absent sur le chemin legacy. */
  etape?: string;
  approbation: {
    numero_demande: number;
    type_approbation: string;
    email_approbant: string;
    decision: string;
    commentaire: string;
    Date_approbation: string | null;
    id_approbation: number;
  };
}