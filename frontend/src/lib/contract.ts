import type {
  Demande,
  Approbation,
  ServiceImpacte,
  HistoriqueAudit,
  NotificationItem,
  Utilisateur,
  SujetDemande,
  PlanAction,
  Reunion,
  Diffusion,
  MailItem,
  ParametreTabDivers,
  TabDiversItem,
  TypeApprobation,
  ProduitReferentiel,
  ParametresServeur,
  PendingApproval,
  AuthSessionInfo,
  WorkflowDetail,
  WorkflowAdminBundle,
  WorkflowVersionSummary,
  WorkflowEtapeApprobateur,
  WorkflowApprobateurInput,
  RoleItem,
  PermissionItem,
  UserRoleItem,
  WorkflowStrategie,
  WorkflowModeEtape,
} from '../types';

/* -------------------------------------------------------------------------- */
/*  Dashboard stats interface                                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  totalDemandes: number;
  enAttenteApprobation: number;
  enCoursExecution: number;
  clotureesValidees: number;
  enRetardCount: number;
  tauxRespectDelaiPct: number | null;
  délaiMoyenJours: number;
  repartitionParStatut: { name: string; count: number; color: string }[];
  evolutionMensuelle: { key: string; mois: string; soumises: number; validees: number }[];
}

/* -------------------------------------------------------------------------- */
/*  Client contract interface                                                  */
/* -------------------------------------------------------------------------- */

export interface MedicisApiClientContract {
  /* ------------- Demandes ------------- */
  getDemandes(params?: {
    search?: string;
    statut?: string;
    service?: string;
    type?: string;
    site?: string;
    classement?: string;
  }): Promise<Demande[]>;
  getDemandeById(numero_demande: number): Promise<Demande | null>;
  createDemande(data: Omit<Demande, 'numero_demande' | 'numero_chronologique'>): Promise<Demande>;

  /* ------------- Sujet_Demande (1:N) ------------- */
  getSujetsByDemande(numero_demande: number): Promise<SujetDemande[]>;
  addSujet(sujet: Omit<SujetDemande, 'id_sujet'>): Promise<SujetDemande>;

  /* ------------- Approbation & Workflow ------------- */
  getApprobationsByDemande(numero_demande: number): Promise<Approbation[]>;
  getPendingApprovals(): Promise<PendingApproval[]>;
  submitApproval(payload: {
    numero_demande: number;
    type_approbation: TypeApprobation;
    email_approbant: string;
    decision: Approbation['decision'];
    commentaire: string;
    markIncomplete?: boolean;
  }): Promise<{ success: boolean; message: string; nouvelleApprobation: Approbation }>;

  /* ------------- Workflow configurable (Phase B) ------------- */
  getWorkflowCurrent(): Promise<WorkflowDetail | null>;
  getWorkflowAdmin(): Promise<WorkflowAdminBundle>;
  getWorkflowVersionDetail(idVersion: number): Promise<WorkflowDetail | null>;
  createWorkflowVersion(idWorkflow: number): Promise<WorkflowDetail>;
  publishWorkflowVersion(idWorkflow: number, idVersion: number): Promise<WorkflowDetail>;
  updateStageApprovers(
    idVersion: number,
    etapeCode: string,
    approbateurs: WorkflowApprobateurInput[],
    opts?: { strategie?: WorkflowStrategie; mode?: WorkflowModeEtape; min_decisions?: number }
  ): Promise<WorkflowDetail>;

  /* ------------- RBAC admin (Phase C) ------------- */
  getRolesAdmin(): Promise<{ roles: RoleItem[]; permissions: PermissionItem[] }>;
  getUserRoles(userId: number): Promise<UserRoleItem[]>;
  assignUserRoles(userId: number, roleCodes: string[]): Promise<UserRoleItem[]>;
  updateRolePermissions(roleCode: string, permCodes: string[]): Promise<RoleItem | null>;
  getWorkflowVersions(idWorkflow: number): Promise<WorkflowVersionSummary[]>;

  /* ------------- Service_impactees ------------- */
  getServicesImpactesByDemande(numero_demande: number): Promise<ServiceImpacte[]>;
  updateServiceImpact(numero_demande: number, patch: { service: string; email_cancernee: string } & Partial<ServiceImpacte>): Promise<ServiceImpacte>;
  addServiceImpact(numero_demande: number, impact: Pick<ServiceImpacte, 'service' | 'email_cancernee' | 'fonction'>): Promise<ServiceImpacte>;

  /* ------------- Plan_actions ------------- */
  getPlanActionsByDemande(numero_demande: number): Promise<PlanAction[]>;
  createPlanAction(plan: Omit<PlanAction, 'id_plan_action'>): Promise<PlanAction>;
  updatePlanAction(id_plan_action: number, patch: Partial<PlanAction>): Promise<PlanAction>;

  /* ------------- Réunions ------------- */
  getReunions(): Promise<Reunion[]>;
  createReunion(reunion: Omit<Reunion, 'id_reunion'>): Promise<Reunion>;

  /* ------------- Diffusions (demandes clôturées validées) ------------- */
  getDiffusions(): Promise<Diffusion[]>;
  getDiffusionsByDemande(numero_demande: number): Promise<Diffusion[]>;
  createDiffusion(diffusion: Omit<Diffusion, 'id_diffusion'>): Promise<Diffusion>;

  /* ------------- Mailing ------------- */
  getMailings(): Promise<MailItem[]>;
  createMailing(mailing: Omit<MailItem, 'id_mail'>): Promise<MailItem>;
  updateMailing(id_mail: number, patch: Partial<MailItem>): Promise<MailItem>;

  /* ------------- Historique (journal d'audit) ------------- */
  getAuditTrail(numero_chronologique?: string): Promise<HistoriqueAudit[]>;

  /* ------------- Utilisateurs & Droits (Accees) ------------- */
  getUsers(query?: string): Promise<Utilisateur[]>;
  getUserByEmail(email: string): Promise<Utilisateur | null>;
  saveUser(user: Partial<Utilisateur> & { id_user?: number }): Promise<Utilisateur>;
  getApprobateurs(): Promise<Utilisateur[]>;

  /* ------------- Notifications (ROWID, etat_lecture, lien) ------------- */
  getNotifications(emailConcerne: string): Promise<NotificationItem[]>;
  markNotificationRead(rowid: number): Promise<void>;

  /* ------------- Référentiels (Tab_Divers) ------------- */
  getProducts(): Promise<ProduitReferentiel[]>;
  getTabDivers(parametre?: ParametreTabDivers | string): Promise<TabDiversItem[]>;
  getSites(): Promise<TabDiversItem[]>;
  getTypesChangement(): Promise<TabDiversItem[]>;
  saveTabDivers(item: Omit<TabDiversItem, 'id_tab_divers'>): Promise<TabDiversItem>;
  removeTabDivers(id_tab_divers: number): Promise<void>;

  /* ------------- Paramètres serveur ------------- */
  getServeur(): Promise<ParametresServeur>;
  updateServeur(patch: Partial<ParametresServeur>): Promise<ParametresServeur>;

  /* ------------- Pièces jointes (frontend) ------------- */
  getPiecesJointes(): Promise<{ nom_fichier: string; taille_octets: number }[]>;

  /* ------------- Statistiques ------------- */
  getDashboardStats(): Promise<DashboardStats>;

  /* ------------- Authentification ------------- */
  authLogin(email: string, password?: string): Promise<Utilisateur & AuthSessionInfo | null>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<Utilisateur & AuthSessionInfo | null>;
}