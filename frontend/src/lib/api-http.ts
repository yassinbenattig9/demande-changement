import {
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
  WorkflowState,
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
import { MedicisApiClientContract, DashboardStats } from './contract';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `Erreur HTTP ${res.status}`;
    try {
      const b = await res.json();
      msg = b.error || b.message || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0')
    return undefined as T;
  return res.json();
}

function j(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  };
}

const toNum = (v: any, d = 0): number => {
  const n = Number(v);
  return Number.isNaN(n) ? d : n;
};
const toBool = (v: any): boolean =>
  v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
const toStr = (v: any, d = ''): string => (v == null ? d : String(v));
const toNull = (v: any): string | null =>
  v == null || v === '' ? null : String(v);
const enc = encodeURIComponent;

function mapDemande(r: any): Demande {
  return {
    ...r,
    numero_demande: toNum(r.numero_demande),
    cloturer: toBool(r.cloturer),
    nbr_reponse_services: toNum(r.nbr_reponse_services),
    nom_demandeur: r.nom_demandeur || r.demandeur,
    pieces_jointes_count: toNum(r.pieces_jointes_count),
  };
}

function mapUser(r: any): Utilisateur {
  return {
    ...r,
    id_user: toNum(r.id_user || r.rowid),
    DirecteurAQ: toBool(r.DirecteurAQ),
    MemberAQ: toBool(r.MemberAQ),
    est_actif: r.est_actif === undefined ? true : toBool(r.est_actif),
  };
}

function mapApprobation(r: any): Approbation {
  return {
    numero_demande: toNum(r.numero_demande),
    type_approbation: toStr(r.type_approbation) as TypeApprobation,
    email_approbant: toStr(r.email_approbant),
    decision: r.decision || '',
    commentaire: toStr(r.commentaire),
    Date_approbation: toNull(r.Date_approbation),
    id_approbation: r.id_approbation ?? r.numero_approbation ?? r.rowid,
  };
}

function mapImpact(r: any): ServiceImpacte {
  return {
    numero_demande: toNum(r.numero_demande),
    service: toStr(r.service),
    email_cancernee: toStr(r.email_cancernee),
    fonction: toStr(r.fonction),
    reponse: toStr(r.reponse),
    date_reponse: toNull(r.date_reponse),
    commentaire: toStr(r.commentaire),
    Intervenant: toStr(r.Intervenant),
    id_impact: r.id_impact ?? r.rowid,
  };
}

function mapPlan(r: any): PlanAction {
  return {
    numero_demande: toNum(r.numero_demande),
    action_description: toStr(r.action_description ?? r.Actions),
    responsable: toStr(r.responsable ?? r.email_utilisateur),
    delai: toNull(r.delai),
    statut: r.statut || 'en_cours',
    action_qualipro: toNull(r.action_qualipro ?? r.action_chronologique),
    date_creation: toStr(r.date_creation),
    date_modification: toStr(r.date_modification || r.date_creation),
    id_plan_action: r.id_plan_action ?? r.rowid,
  };
}

function mapReunion(r: any): Reunion {
  return {
    date_reunion: toStr(r.date_reunion ?? r.date),
    lieu: toStr(r.lieu),
    ordre_du_jour: toStr(r.ordre_du_jour ?? r.titre_reunion),
    participants: toStr(r.participants ?? r.createur),
    compte_rendu: toStr(r.compte_rendu),
    demandes_discutees: toStr(r.demandes_discutees),
    date_creation: toStr(r.date_creation),
    id_reunion: r.id_reunion ?? r.rowid,
  };
}

function mapDiffusion(r: any): Diffusion {
  return {
    Num_Dem: toNum(r.Num_Dem),
    Email: toStr(r.Email),
    Date_Diffusion: toStr(r.Date_Diffusion),
    id_diffusion: r.id_diffusion ?? r.ROWID,
  };
}

function mapMail(r: any): MailItem {
  return {
    numero_demande: toNum(r.numero_demande),
    email: toStr(r.email),
    message: toStr(r.message),
    frequence: toStr(r.frequence),
    date_creation_mailing: toStr(r.date_creation_mailing),
    reponse: toStr(r.reponse),
    numero_chronologique: toStr(r.numero_chronologique),
    dernier_envoi: toNull(r.dernier_envoi),
    frequence_par_jour: toStr(r.frequence_par_jour),
    etat_demande: toStr(r.etat_demande),
    reponse_service: toStr(r.reponse_service),
    id_mail: r.id_mail ?? r.rowid,
  };
}

function mapHisto(r: any): HistoriqueAudit {
  return {
    utilisateur: toStr(r.utilisateur),
    action: toStr(r.action),
    page_source: toStr(r.page_source),
    date: toStr(r.date),
    commentaire: toStr(r.commentaire),
    numero_chronologique: toStr(r.numero_chronologique),
    id_historique: r.id_historique ?? r.ROWID,
  };
}

function mapNotif(r: any): NotificationItem {
  return {
    ROWID: toNum(r.ROWID),
    titre: toStr(r.titre),
    date: toStr(r.date),
    lien: toStr(r.lien),
    email_concerne: toStr(r.email_concerne),
    etat_lecture:
      r.etat_lecture === '0' || r.etat_lecture === '1'
        ? (r.etat_lecture as '0' | '1')
        : '0',
    id_demande: (() => {
      const m = String(r.lien ?? '').match(/(\d+)/);
      return m ? Number(m[1]) : undefined;
    })(),
  };
}

function mapTabDivers(r: any): TabDiversItem {
  return {
    parametre: toStr(r.parametre),
    designation: toStr(r.designation),
    code: toStr(r.code),
    id_tab_divers: r.id_tab_divers ?? r.rowid,
  };
}

function mapSujet(r: any): SujetDemande {
  return {
    numero_demande: toNum(r.numero_demande),
    Sujet: toStr(r.Sujet),
    Designation: toStr(r.Designation),
    Code_ou_indexation: toStr(r.Code_ou_indexation),
    id_sujet: r.id_sujet ?? r.ROWID ?? r.rowid,
  };
}

function mapApprobateurRef(r: any): WorkflowEtapeApprobateur {
  return {
    id_approbateur: toNum(r.id_approbateur),
    type: r.type === 'email' ? 'email' : 'role',
    id_reference: toStr(r.id_reference),
    ordre: toNum(r.ordre, 1),
    obligatoire: toNum(r.obligatoire, 1),
  };
}

function mapWorkflowDetail(r: any): WorkflowDetail | null {
  if (!r) return null;
  const etapes = (r.etapes ?? []).map((e: any) => ({
    id_etape: toNum(e.id_etape),
    code: toStr(e.code),
    libelle: toStr(e.libelle),
    ordre: toNum(e.ordre),
    mode: (e.mode || 'sequence') as WorkflowModeEtape,
    strategie: (e.strategie || 'tous') as WorkflowStrategie,
    min_decisions: toNum(e.min_decisions),
    approbateurs: (e.approbateurs ?? []).map(mapApprobateurRef),
  }));
  const detail = {
    id_version: toNum(r.id_version),
    numero: toNum(r.numero),
    statut: r.statut === 'publiee' ? ('publiee' as const) : ('brouillon' as const),
    date_publication: toNull(r.date_publication),
    etapes,
  };
  return detail;
}

function mapWorkflowVersionSummary(r: any): WorkflowVersionSummary {
  return {
    id_version: toNum(r.id_version),
    id_workflow: toNum(r.id_workflow),
    numero: toNum(r.numero),
    statut: r.statut === 'publiee' ? ('publiee' as const) : ('brouillon' as const),
    date_publication: toNull(r.date_publication),
  };
}

function mapWorkflowBundle(r: any): WorkflowAdminBundle {
  return {
    configs: (r.configs ?? []).map((c: any) => ({
      id_workflow: toNum(c.id_workflow),
      code: toStr(c.code),
      libelle: toStr(c.libelle),
      actif: c.actif,
      versions: (c.versions ?? []).map(mapWorkflowVersionSummary),
    })),
    active: mapWorkflowDetail(r.active),
  };
}

function mapRole(r: any): RoleItem {
  return {
    id_role: toNum(r.id_role),
    code: toStr(r.code),
    libelle: toStr(r.libelle),
    nb_users: toNum(r.nb_users),
    permissions: (r.permissions ?? []).map((p: any) => ({
      code: toStr(p.code),
      libelle: toStr(p.libelle),
      module: toStr(p.module),
      site_code: toNull(p.site_code),
    })),
  };
}

function mapPermission(r: any): PermissionItem {
  return {
    id_perm: toNum(r.id_perm),
    code: toStr(r.code),
    libelle: toStr(r.libelle),
    module: toStr(r.module),
  };
}

function mapUserRole(r: any): UserRoleItem {
  return {
    id_role: toNum(r.id_role),
    code: toStr(r.code),
    libelle: toStr(r.libelle),
  };
}

function mapPendingApproval(r: any): PendingApproval {
  return {
    demande: mapDemande(r.demande),
    etape: r.etape ? toStr(r.etape) : undefined,
    approbation: {
      numero_demande: toNum(r.approbation?.numero_demande),
      type_approbation: toStr(r.approbation?.type_approbation),
      email_approbant: toStr(r.approbation?.email_approbant),
      decision: toStr(r.approbation?.decision),
      commentaire: toStr(r.approbation?.commentaire),
      Date_approbation: toNull(r.approbation?.Date_approbation),
      id_approbation: toNum(r.approbation?.id_approbation ?? r.approbation?.numero_approbation, 0),
    },
  };
}

export const httpApi: MedicisApiClientContract = {
  // ─── Demandes ──────────────────────────────────────────────
  async getDemandes(params?: {
    search?: string;
    statut?: string;
    service?: string;
    type?: string;
    site?: string;
    classement?: string;
  }): Promise<Demande[]> {
    const q: string[] = [];
    if (params?.search) q.push(`search=${enc(params.search)}`);
    if (params?.statut) q.push(`statut=${enc(params.statut)}`);
    if (params?.service) q.push(`service=${enc(params.service)}`);
    if (params?.type) q.push(`type=${enc(params.type)}`);
    if (params?.site) q.push(`site=${enc(params.site)}`);
    if (params?.classement) q.push(`classement=${enc(params.classement)}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    const rows = await req<any[]>(`/demandes${qs}`);
    return rows.map(mapDemande);
  },

  async getDemandeById(id: number): Promise<Demande | null> {
    try {
      const r = await req<any>(`/demandes/${id}`);
      return mapDemande(r);
    } catch (e: any) {
      if (String(e.message).includes('404')) return null;
      throw e;
    }
  },

  async createDemande(data: Partial<Demande>): Promise<Demande> {
    const r = await req<any>('/demandes', j('POST', data));
    return mapDemande(r);
  },

  // ─── Sujets ────────────────────────────────────────────────
  async getSujetsByDemande(id: number): Promise<SujetDemande[]> {
    const rows = await req<any[]>(`/demandes/${id}/sujets`);
    return rows.map(mapSujet);
  },

  async addSujet(sujet: SujetDemande): Promise<SujetDemande> {
    const r = await req<any>(
      `/demandes/${sujet.numero_demande}/sujets`,
      j('POST', sujet),
    );
    return mapSujet(r);
  },

  // ─── Approbations ──────────────────────────────────────────
  async getApprobationsByDemande(id: number): Promise<Approbation[]> {
    const rows = await req<any[]>(`/demandes/${id}/approbations`);
    return rows.map(mapApprobation);
  },

  async submitApproval(payload: {
    numero_demande: number;
    type_approbation: string;
    email_approbant: string;
    decision: string;
    commentaire: string;
    markIncomplete?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    nouvelleApprobation: Approbation;
  }> {
    const res = await req<{
      success: boolean;
      message: string;
      nouvelleApprobation: any;
    }>(
      `/demandes/${payload.numero_demande}/approbations/${enc(payload.type_approbation)}`,
      j('PUT', {
        email_approbant: payload.email_approbant,
        decision: payload.decision,
        commentaire: payload.commentaire,
        markIncomplete: payload.markIncomplete,
      }),
    );
    return {
      ...res,
      nouvelleApprobation: mapApprobation(res.nouvelleApprobation),
    };
  },

  // ─── Impacts ───────────────────────────────────────────────
  async getServicesImpactesByDemande(id: number): Promise<ServiceImpacte[]> {
    const rows = await req<any[]>(`/demandes/${id}/impacts`);
    return rows.map(mapImpact);
  },

  async updateServiceImpact(
    numero_demande: number,
    patch: ServiceImpacte,
  ): Promise<ServiceImpacte> {
    const r = await req<any>(
      `/demandes/${numero_demande}/impacts/${enc(patch.service)}/${enc(patch.email_cancernee)}`,
      j('PUT', {
        reponse: patch.reponse,
        date_reponse: patch.date_reponse,
        commentaire: patch.commentaire,
        Intervenant: patch.Intervenant,
        fonction: patch.fonction,
      }),
    );
    return mapImpact(r);
  },

  async addServiceImpact(
    numero_demande: number,
    impact: ServiceImpacte,
  ): Promise<ServiceImpacte> {
    const r = await req<any>(
      `/demandes/${numero_demande}/impacts`,
      j('POST', impact),
    );
    return mapImpact(r);
  },

  // ─── Plan Actions ──────────────────────────────────────────
  async getPlanActionsByDemande(id: number): Promise<PlanAction[]> {
    const rows = await req<any[]>(`/demandes/${id}/plans`);
    return rows.map(mapPlan);
  },

  async createPlanAction(plan: PlanAction): Promise<PlanAction> {
    const r = await req<any>('/plans', j('POST', plan));
    return mapPlan(r);
  },

  async updatePlanAction(
    id: number,
    patch: Partial<PlanAction>,
  ): Promise<PlanAction> {
    const r = await req<any>(`/plans/${id}`, j('PUT', patch));
    return mapPlan(r);
  },

  // ─── Reunions ──────────────────────────────────────────────
  async getReunions(): Promise<Reunion[]> {
    const rows = await req<any[]>('/reunions');
    return rows.map(mapReunion);
  },

  async createReunion(reunion: Reunion): Promise<Reunion> {
    const r = await req<any>('/reunions', j('POST', reunion));
    return mapReunion(r);
  },

  // ─── Diffusions ────────────────────────────────────────────
  async getDiffusions(): Promise<Diffusion[]> {
    const rows = await req<any[]>('/diffusions');
    return rows.map(mapDiffusion);
  },

  async getDiffusionsByDemande(id: number): Promise<Diffusion[]> {
    const rows = await req<any[]>(`/demandes/${id}/diffusions`);
    return rows.map(mapDiffusion);
  },

  async createDiffusion(diffusion: Diffusion): Promise<Diffusion> {
    const r = await req<any>('/diffusions', j('POST', diffusion));
    return mapDiffusion(r);
  },

  // ─── Mailing ───────────────────────────────────────────────
  async getMailings(): Promise<MailItem[]> {
    const rows = await req<any[]>('/mailings');
    return rows.map(mapMail);
  },

  async createMailing(mailing: MailItem): Promise<MailItem> {
    const r = await req<any>('/mailings', j('POST', mailing));
    return mapMail(r);
  },

  async updateMailing(id: number, patch: Partial<MailItem>): Promise<MailItem> {
    const r = await req<any>(`/mailings/${id}`, j('PUT', patch));
    return mapMail(r);
  },

  // ─── Historique ────────────────────────────────────────────
  async getAuditTrail(numero_chronologique?: string): Promise<HistoriqueAudit[]> {
    const qs = numero_chronologique
      ? `?numero_chronologique=${enc(numero_chronologique)}`
      : '';
    const rows = await req<any[]>(`/historique${qs}`);
    return rows.map(mapHisto);
  },

  // ─── Users ─────────────────────────────────────────────────
  async getUsers(query?: string): Promise<Utilisateur[]> {
    const qs = query ? `?q=${enc(query)}` : '';
    const rows = await req<any[]>(`/users${qs}`);
    return rows.map(mapUser);
  },

  async getUserByEmail(email: string): Promise<Utilisateur | null> {
    try {
      const r = await req<any>(`/users?email=${enc(email)}`);
      if (!r) return null;
      return Array.isArray(r) ? (r[0] ? mapUser(r[0]) : null) : mapUser(r);
    } catch {
      return null;
    }
  },

  async saveUser(user: Utilisateur): Promise<Utilisateur> {
    if (user.id_user) {
      const r = await req<any>(`/users/${user.id_user}`, j('PUT', user));
      return mapUser(r);
    }
    const r = await req<any>('/users', j('POST', user));
    return mapUser(r);
  },

  async getApprobateurs(): Promise<Utilisateur[]> {
    const rows = await req<any[]>('/users/approbateurs');
    return rows.map(mapUser);
  },

  // ─── Notifications ─────────────────────────────────────────
  async getNotifications(email: string): Promise<NotificationItem[]> {
    const rows = await req<any[]>(`/notifications/${enc(email)}`);
    return rows.map(mapNotif);
  },

  async markNotificationRead(rowid: number): Promise<void> {
    await req<void>(`/notifications/${rowid}/read`, j('PUT'));
  },

  // ─── Referentiels ──────────────────────────────────────────
  async getProducts(): Promise<ProduitReferentiel[]> {
    const rows = await req<any[]>('/products');
    return rows.map((r: any) => ({
      code: toStr(r.code),
      designation: toStr(r.designation),
    }));
  },

  async getTabDivers(parametre?: string): Promise<TabDiversItem[]> {
    const qs = parametre ? `?parametre=${enc(parametre)}` : '';
    const rows = await req<any[]>(`/tab-divers${qs}`);
    return rows.map(mapTabDivers);
  },

  async getSites(): Promise<TabDiversItem[]> {
    const rows = await req<any[]>('/tab-divers?parametre=site');
    return rows.map(mapTabDivers);
  },

  async getTypesChangement(): Promise<TabDiversItem[]> {
    const rows = await req<any[]>('/tab-divers?parametre=type');
    return rows.map(mapTabDivers);
  },

  async saveTabDivers(item: TabDiversItem): Promise<TabDiversItem> {
    const r = await req<any>('/tab-divers', j('POST', item));
    return mapTabDivers(r);
  },

  async removeTabDivers(id: number): Promise<void> {
    await req<void>(`/tab-divers/${id}`, j('DELETE'));
  },

  // ─── Serveur ───────────────────────────────────────────────
  async getServeur(): Promise<ParametresServeur> {
    return req<ParametresServeur>('/serveur');
  },

  async updateServeur(patch: Partial<ParametresServeur>): Promise<ParametresServeur> {
    return req<ParametresServeur>('/serveur', j('PUT', patch));
  },

  // ─── Pieces Jointes ────────────────────────────────────────
  async getPiecesJointes(): Promise<{ nom_fichier: string; taille_octets: number }[]> {
    return req<{ nom_fichier: string; taille_octets: number }[]>('/pieces-jointes');
  },

  // ─── Stats ─────────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    return req<DashboardStats>('/stats/dashboard');
  },

  // ─── Auth ──────────────────────────────────────────────────
  async authLogin(
    email: string,
    password: string,
  ): Promise<(Utilisateur & AuthSessionInfo) | null> {
    try {
      const res = await req<{ success: boolean; user: any; permissions?: string[]; roles?: string[]; siteAccess?: Record<string, string> }>(
        '/auth/login',
        j('POST', { email, password }),
      );
      if (res.success && res.user) {
        return {
          ...mapUser(res.user),
          permissions: Array.isArray(res.permissions) ? res.permissions : [],
          roles: Array.isArray(res.roles) ? res.roles : [],
          siteAccess: res.siteAccess || {},
        };
      }
      return null;
    } catch (e: any) {
      if (String(e.message).includes('401')) return null;
      throw e;
    }
  },

  async logout(): Promise<void> {
    try { await req<{ success: boolean }>('/auth/logout', j('POST')); } catch {}
  },

  async getCurrentUser(): Promise<(Utilisateur & AuthSessionInfo) | null> {
    try {
      const res = await req<{ user: any; permissions?: string[]; roles?: string[]; siteAccess?: Record<string, string> }>('/auth/me');
      if (!res.user) return null;
      return {
        ...mapUser(res.user),
        permissions: Array.isArray(res.permissions) ? res.permissions : [],
        roles: Array.isArray(res.roles) ? res.roles : [],
        siteAccess: res.siteAccess || {},
      };
    } catch {
      return null;
    }
  },

  // ─── File d'approbation + Workflow (Phase B) ──────────────
  async getPendingApprovals(): Promise<PendingApproval[]> {
    const rows = await req<any[]>('/approbations/en-attente');
    return (rows ?? []).map(mapPendingApproval);
  },

  async getWorkflowCurrent(): Promise<WorkflowDetail | null> {
    return mapWorkflowDetail(await req<any>('/workflow/current'));
  },

  async getWorkflowAdmin(): Promise<WorkflowAdminBundle> {
    return mapWorkflowBundle(await req<any>('/admin/workflow'));
  },

  async getWorkflowVersionDetail(idVersion: number): Promise<WorkflowDetail | null> {
    try {
      return mapWorkflowDetail(await req<any>(`/admin/workflow/versions/${idVersion}`));
    } catch {
      return null;
    }
  },

  async createWorkflowVersion(idWorkflow: number): Promise<WorkflowDetail> {
    return mapWorkflowDetail(await req<any>(`/admin/workflow/${idWorkflow}/versions`, j('POST', {})))!;
  },

  async publishWorkflowVersion(idWorkflow: number, idVersion: number): Promise<WorkflowDetail> {
    return mapWorkflowDetail(await req<any>(`/admin/workflow/${idWorkflow}/versions/${idVersion}/publish`, j('POST', {})))!;
  },

  async updateStageApprovers(
    idVersion: number,
    etapeCode: string,
    approbateurs: WorkflowApprobateurInput[],
    opts?: { strategie?: WorkflowStrategie; mode?: WorkflowModeEtape; min_decisions?: number },
  ): Promise<WorkflowDetail> {
    return mapWorkflowDetail(await req<any>(
      `/admin/workflow/versions/${idVersion}/etapes/${enc(etapeCode)}`,
      j('PUT', { approbateurs, ...(opts || {}) }),
    ))!;
  },

  async getWorkflowVersions(idWorkflow: number): Promise<WorkflowVersionSummary[]> {
    const bundle = await req<any>('/admin/workflow');
    const withVersions = mapWorkflowBundle(bundle);
    const cfg = withVersions.configs.find((c) => c.id_workflow === idWorkflow);
    return cfg?.versions ?? [];
  },

  // ─── RBAC admin (Phase C) ─────────────────────────────────
  async getRolesAdmin(): Promise<{ roles: RoleItem[]; permissions: PermissionItem[] }> {
    const res = await req<{ roles: any[]; permissions: any[] }>('/admin/roles');
    return {
      roles: (res.roles ?? []).map(mapRole),
      permissions: (res.permissions ?? []).map(mapPermission),
    };
  },

  async getUserRoles(userId: number): Promise<UserRoleItem[]> {
    const rows = await req<any[]>(`/admin/users/${userId}/roles`);
    return (rows ?? []).map(mapUserRole);
  },

  async assignUserRoles(userId: number, roleCodes: string[]): Promise<UserRoleItem[]> {
    const rows = await req<any[]>(`/admin/users/${userId}/roles`, j('PUT', { roles: roleCodes }));
    return (rows ?? []).map(mapUserRole);
  },

  async updateRolePermissions(roleCode: string, permCodes: string[]): Promise<RoleItem | null> {
    const r = await req<any>(`/admin/roles/${enc(roleCode)}/permissions`, j('PUT', { permissions: permCodes }));
    return r ? mapRole(r) : null;
  },
};
