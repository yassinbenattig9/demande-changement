import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Edit2, CheckCircle2, XCircle, Key, Building } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, Column } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import {
  Utilisateur,
  UserPermissions,
  parseAccees,
  buildAccees,
  ACCEES_DEFINITIONS,
  ACCEES_LENGTH,
  SITE_CODES_LABELS,
  ROLE_SPECIAL_LABELS,
} from '../types';


const FLAG_KEY_BY_POSITION: Record<number, keyof UserPermissions> = {
  0: 'acces_base',
  1: 'peut_creer_demande',
  2: 'peut_valider_hierarchie',
  3: 'peut_valider_charge_changement',
  4: 'peut_valider_responsable_changement',
  5: 'peut_valider_prt',
  6: 'peut_consulter',
  7: 'peut_plans_action',
  8: 'peut_evaluation_cloture',
  9: 'peut_reunions',
  10: 'peut_parametrage_mailing',
  11: 'peut_parametrages',
  13: 'peut_gestion_utilisateurs',
  14: 'peut_avis_services',
  15: 'peut_historique',
};

const SITE_KEY_BY_POSITION: Record<number, keyof UserPermissions> = {
  16: 'sites_charge',
  17: 'sites_responsable',
  19: 'sites_plan_action',
  20: 'sites_cloture',
  21: 'sites_validation_prt',
};

const DEFAULT_PERMISSIONS: UserPermissions = parseAccees('0000000000000000000000');
const INPUT_CLS =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600';

interface UserForm {
  id_user?: number;
  nom: string;
  prenom: string;
  email: string;
  service: string;
  fonction: string;
  Role_user: string;
  Site: string;
  signataire: string;
  DirecteurAQ: boolean;
  MemberAQ: boolean;
  est_actif: boolean;
}

const emptyForm = (): UserForm => ({
  nom: '',
  prenom: '',
  email: '',
  service: 'Production Formes Sèches',
  fonction: 'Demandeur',
  Role_user: 'Demandeur',
  Site: 'JO',
  signataire: '',
  DirecteurAQ: false,
  MemberAQ: false,
  est_actif: true,
});

export const UserAdminPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm());
  const [permissionsState, setPermissionsState] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      setUsers(await apiClient.getUsers());
    } catch {
      error('Erreur', 'Impossible de récupérer la liste des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData(emptyForm());
    setPermissionsState(DEFAULT_PERMISSIONS);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: Utilisateur) => {
    setEditingUser(user);
    setFormData({
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      service: user.service,
      fonction: user.fonction,
      Role_user: user.Role_user,
      Site: user.Site,
      signataire: user.signataire ?? '',
      DirecteurAQ: user.DirecteurAQ,
      MemberAQ: user.MemberAQ,
      est_actif: user.est_actif ?? true,
    });
    setPermissionsState(parseAccees(user.Accees, { DirecteurAQ: user.DirecteurAQ, MemberAQ: user.MemberAQ }));
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim()) {
      error('Champs manquants', 'Le nom, prénom et e-mail sont obligatoires.');
      return;
    }
    if (!editingUser && users.some((u) => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
      error('E-mail déjà utilisé', 'Un compte existe déjà avec cette adresse professionnelle.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await apiClient.saveUser({
        ...formData,
        signataire: formData.signataire.trim() || null,
        Accees: buildAccees(permissionsState),
      });
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id_user === saved.id_user);
        return idx >= 0 ? prev.map((u) => (u.id_user === saved.id_user ? saved : u)) : [...prev, saved];
      });
      setIsModalOpen(false);
      success(
        editingUser ? 'Utilisateur mis à jour' : 'Compte créé',
        `${saved.prenom} ${saved.nom} — habilitations Accees (${ACCEES_LENGTH} positions) enregistrées.`
      );
    } catch {
      error('Erreur', "Impossible de sauvegarder l'utilisateur.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFlag = (key: keyof UserPermissions, position: number) => {
    setPermissionsState((prev) => ({ ...prev, [key]: position === 0 ? true : !prev[key] }));
  };

  const liveAccees = buildAccees(permissionsState);

  const columns: Column<Utilisateur>[] = [
    {
      header: 'Collaborateur',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
            {row.prenom[0]}
            {row.nom[0]}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">{row.prenom} {row.nom}</p>
            <p className="text-[11px] text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Fonction & Rôle',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-teal-700 font-semibold">{row.Role_user}</p>
          <p className="text-slate-500 text-[11px]">{row.fonction}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Site',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-700">{row.Site}</span>
        </div>
      ),
    },
    {
      header: 'Habilitations GxP',
      accessor: (row) => {
        const perms = parseAccees(row.Accees, { DirecteurAQ: row.DirecteurAQ, MemberAQ: row.MemberAQ });
        const count = row.Accees ? row.Accees.split('').filter((c) => c !== '0').length : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700">{count} / {ACCEES_LENGTH} bits</span>
            {perms.est_directeur_qa && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Dir. QA</span>}
            {perms.est_membre_qa && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">QA</span>}
            {perms.peut_administrer && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">Admin</span>}
          </div>
        );
      },
    },
    {
      header: 'Statut',
      accessor: (row) => (
        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${row.est_actif ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {row.est_actif ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {row.est_actif ? 'Actif' : 'Inactif'}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
            Modifier
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration des Utilisateurs & Habilitations"
        subtitle="Gestion des comptes collaborateurs et des droits Accees (22 positions SQL Server DCMEDICIS)."
        badge={
          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-mono">
            {users.length} comptes référencés
          </span>
        }
        actions={
          <Button variant="primary" onClick={handleOpenCreate} leftIcon={<UserPlus className="w-4 h-4" />}>
            Nouvel utilisateur
          </Button>
        }
      />

      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(item) => item.id_user}
        searchableKey="nom"
        searchPlaceholder="Rechercher par nom, prénom, e-mail, service..."
        isLoading={isLoading}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-150" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUser ? 'Modifier le collaborateur' : 'Créer un nouveau compte'}
                  </h3>
                  <p className="text-xs text-slate-500">Champs Utilisateurs (DCMEDICIS) + éditeur Accees (22 positions)</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nom</label>
                  <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Prénom</label>
                  <input type="text" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">E-mail professionnel (clé)</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`${INPUT_CLS} font-mono`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Service</label>
                  <input type="text" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Fonction</label>
                  <input type="text" value={formData.fonction} onChange={(e) => setFormData({ ...formData, fonction: e.target.value })} className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Rôle attribué</label>
                  <input type="text" value={formData.Role_user} onChange={(e) => setFormData({ ...formData, Role_user: e.target.value })} className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Site(s)</label>
                  <select value={formData.Site} onChange={(e) => setFormData({ ...formData, Site: e.target.value })} className={INPUT_CLS}>
                    <option>SS</option>
                    <option>JO</option>
                    <option>EF</option>
                    <option>JO + EF</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Signataire (supérieur hiérarchique)</label>
                  <input type="email" value={formData.signataire} onChange={(e) => setFormData({ ...formData, signataire: e.target.value })} className={`${INPUT_CLS} font-mono`} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-teal-700" />
                      Éditeur des habilitations Accees ({ACCEES_LENGTH} positions)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Chaîne binaire stockée dans la colonne Utilisateurs.Accees (identique au legacy).</p>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-teal-800 font-bold">
                    {liveAccees}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {liveAccees.split('').map((c, i) => (
                    <div
                      key={i}
                      title={`Position ${i} — ${ACCEES_DEFINITIONS.find((d) => d.position === i)?.label ?? ''}`}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold border ${c !== '0' ? 'bg-teal-600 text-white border-teal-700' : 'bg-slate-100 text-slate-300 border-slate-200'}`}
                    >
                      {i}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACCEES_DEFINITIONS.map((def) => {
                    if (def.position === 12) return null;
                    if (def.kind === 'flag') {
                      const key = FLAG_KEY_BY_POSITION[def.position];
                      if (!key) return null;
                      const checked = Boolean(permissionsState[key]);
                      return (
                        <div key={def.position} onClick={() => toggleFlag(key, def.position)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${checked ? 'bg-teal-50/60 border-teal-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={checked} onChange={() => {}} className="mt-0.5 rounded text-teal-600 focus:ring-teal-600" />
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{def.label}</p>
                              {def.page && <p className="text-[10px] text-slate-400 font-mono">{def.page}</p>}
                            </div>
                          </div>
                          <span className="font-mono text-[9px] px-1 bg-slate-200 text-slate-700 rounded shrink-0">{def.position}</span>
                        </div>
                      );
                    }
                    if (def.kind === 'site') {
                      const key = SITE_KEY_BY_POSITION[def.position];
                      if (!key) return null;
                      const value = Number(permissionsState[key]);
                      return (
                        <div key={def.position} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{def.label}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{def.page ?? '—'}</p>
                          </div>
                          <select value={value} onChange={(e) => setPermissionsState((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-900">
                            {[0, 1, 2, 3].map((s) => (
                              <option key={s} value={s}>{SITE_CODES_LABELS[s].split(' (')[0]}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Rôle spécial (pos. 18)</label>
                    <select
                      value={permissionsState.role_special}
                      onChange={(e) => setPermissionsState((prev) => ({ ...prev, role_special: Number(e.target.value) }))}
                      className="text-xs px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 w-full"
                    >
                      {[0, 2, 3, 4].map((r) => (
                        <option key={r} value={r}>{ROLE_SPECIAL_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Directeur QA</label>
                    <div
                      onClick={() => setFormData({ ...formData, DirecteurAQ: !formData.DirecteurAQ })}
                      className={`p-2 rounded-lg border cursor-pointer text-xs font-semibold text-center ${formData.DirecteurAQ ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      {formData.DirecteurAQ ? 'Oui' : 'Non'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Membre QA</label>
                    <div
                      onClick={() => setFormData({ ...formData, MemberAQ: !formData.MemberAQ })}
                      className={`p-2 rounded-lg border cursor-pointer text-xs font-semibold text-center ${formData.MemberAQ ? 'bg-violet-50 text-violet-700 border-violet-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      {formData.MemberAQ ? 'Oui' : 'Non'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={handleSaveUser} isLoading={isSaving} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Enregistrer les habilitations
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAdminPage;