import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Users,
  Check,
  X,
  Search,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { cn } from '../lib/utils';
import {
  Utilisateur,
  RoleItem,
  PermissionItem,
  UserRoleItem,
} from '../types';

const INPUT_CLS =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600';

const MODULE_COLORS: Record<string, string> = {
  Portail: 'bg-slate-100 text-slate-700',
  Demandes: 'bg-sky-100 text-sky-800',
  Approbations: 'bg-amber-100 text-amber-800',
  'Plan d\'actions': 'bg-emerald-100 text-emerald-800',
  Clôture: 'bg-teal-100 text-teal-800',
  Réunions: 'bg-indigo-100 text-indigo-800',
  Mailing: 'bg-pink-100 text-pink-800',
  Paramétrage: 'bg-violet-100 text-violet-800',
  Administration: 'bg-rose-100 text-rose-800',
  Avis: 'bg-orange-100 text-orange-800',
  Audit: 'bg-slate-200 text-slate-700',
  'Qualité': 'bg-teal-100 text-teal-800',
  'Rôles spéciaux': 'bg-fuchsia-100 text-fuchsia-800',
  Sites: 'bg-lime-100 text-lime-800',
};

export const RolesAdminPage: React.FC = () => {
  const { success, error } = useToast();
  const { serverPermissions } = useAuth();

  const canManage = serverPermissions.includes('admin.utilisateurs');

  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([]);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadRolesAndPermissions = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const data = await apiClient.getRolesAdmin();
      setRoles(data.roles);
      setPermissions(data.permissions);
    } catch {
      error('Erreur', 'Impossible de charger les rôles et permissions.');
    } finally {
      setIsLoadingRoles(false);
    }
  }, [error]);

  useEffect(() => {
    loadRolesAndPermissions();
  }, [loadRolesAndPermissions]);

  useEffect(() => {
    setIsLoadingUsers(true);
    apiClient
      .getUsers(userQuery.length >= 2 ? userQuery : undefined)
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setUsers([]))
      .finally(() => setIsLoadingUsers(false));
  }, [userQuery]);

  useEffect(() => {
    if (!selectedUser) { setUserRoles([]); return; }
    apiClient.getUserRoles(selectedUser.id_user).then(setUserRoles).catch(() => setUserRoles([]));
  }, [selectedUser]);

  const selectedRoleIds = useMemo(() => new Set(userRoles.map((r) => r.id_role)), [userRoles]);

  const handleToggleUserRole = async (role: RoleItem) => {
    if (!selectedUser) return;
    const next = selectedRoleIds.has(role.id_role)
      ? userRoles.filter((r) => r.id_role !== role.id_role).map((r) => r.code)
      : [...userRoles.map((r) => r.code), role.code];
    setIsSaving(true);
    try {
      const updated = await apiClient.assignUserRoles(selectedUser.id_user, next);
      setUserRoles(updated);
      success('Rôle mis à jour', `Les rôles de ${selectedUser.email} ont été enregistrés.`);
    } catch (e) {
      console.error(e);
      error('Erreur', "Impossible de mettre à jour les rôles.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRolePermCodes = useMemo(
    () => new Set(selectedRole?.permissions.map((p) => p.code) ?? []),
    [selectedRole]
  );

  const handleToggleRolePermission = async (perm: PermissionItem) => {
    if (!selectedRole) return;
    const next = selectedRolePermCodes.has(perm.code)
      ? selectedRole.permissions.filter((p) => p.code !== perm.code).map((p) => p.code)
      : [...selectedRole.permissions.map((p) => p.code), perm.code];
    setIsSaving(true);
    try {
      const updated = await apiClient.updateRolePermissions(selectedRole.code, next);
      if (updated) {
        setSelectedRole(updated);
        setRoles((prev) => prev.map((r) => (r.code === updated.code ? updated : r)));
      }
      success('Permissions mises à jour', `Les permissions du rôle ${selectedRole.libelle} ont été enregistrées.`);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de mettre à jour les permissions du rôle.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration des rôles & permissions"
        subtitle="Gérez l'affectation des rôles aux utilisateurs et les permissions associées à chaque rôle. La permission de référence RBAC est 'admin.utilisateurs'."
        badge={
          <span className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-bold text-violet-800">
            {roles.length} rôle(s) • {permissions.length} permission(s)
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : utilisateurs */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Utilisateurs</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Rechercher par nom ou email…"
                className="pl-9 pr-3 py-2 w-full bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {isLoadingUsers && users.length === 0 && (
              <div className="p-4 text-xs text-slate-400">Chargement…</div>
            )}
            {users.slice(0, 50).map((u) => (
              <button
                key={u.id_user}
                onClick={() => { setSelectedUser(u); setSelectedRole(null); }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors',
                  selectedUser?.id_user === u.id_user
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 truncate">{u.prenom} {u.nom}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{u.email} • {u.service}</p>
              </button>
            ))}
            {!isLoadingUsers && users.length === 0 && (
              <div className="p-4 text-xs text-slate-400">Aucun utilisateur trouvé.</div>
            )}
          </div>

          {selectedUser && (
            <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50 space-y-2">
              <p className="text-[11px] font-semibold text-teal-900">
                Rôles de {selectedUser.prenom} {selectedUser.nom}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => {
                  const assigned = selectedRoleIds.has(role.id_role);
                  return (
                    <button
                      key={role.id_role}
                      disabled={isSaving}
                      onClick={() => handleToggleUserRole(role)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors',
                        assigned
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      )}
                    >
                      {assigned && <Check className="w-3 h-3 inline mr-1" />}
                      {role.libelle || role.code}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-teal-700 font-medium">
                {userRoles.length} rôle(s) assigné(s)
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : détail d'un rôle */}
        <div className="lg:col-span-8 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Détail d'un rôle</p>
          <div className="space-y-1.5 max-h-14 overflow-y-auto flex flex-wrap gap-1.5 pr-1">
            {roles.map((role) => (
              <button
                key={role.id_role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                  selectedRole?.id_role === role.id_role
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
                )}
              >
                <Shield className="w-3 h-3 inline mr-1" />
                {role.libelle || role.code}
                <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold', selectedRole?.id_role === role.id_role ? 'bg-violet-400 text-white' : 'bg-slate-100 text-slate-500')}>
                  {role.nb_users}
                </span>
              </button>
            ))}
          </div>

          {selectedRole && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-violet-900">{selectedRole.libelle || selectedRole.code}</p>
                    <p className="text-[11px] text-violet-700">
                      <span className="font-mono">{selectedRole.code}</span> • {selectedRole.permissions.length} permission(s)
                    </p>
                  </div>
                  <span className="text-[11px] text-violet-600 font-medium">
                    {selectedRole.nb_users} utilisateur(s) associé(s)
                  </span>
                </div>
              </div>

              {isLoadingRoles ? (
                <div className="p-4 text-xs text-slate-400">Chargement des permissions…</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {permissions.map((perm) => {
                    const granted = selectedRolePermCodes.has(perm.code);
                    return (
                      <button
                        key={perm.id_perm}
                        disabled={isSaving}
                        onClick={() => handleToggleRolePermission(perm)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-colors',
                          granted
                            ? 'bg-teal-50 border-teal-200 text-teal-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                            granted ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                          )}
                        >
                          {granted && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{perm.libelle}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{perm.code}</p>
                        </div>
                        <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', MODULE_COLORS[perm.module] ?? 'bg-slate-100 text-slate-500')}>
                          {perm.module}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!selectedRole && (
            <div className="p-6 text-center text-sm text-slate-400">
              Sélectionnez un rôle ci-dessus pour gérer ses permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesAdminPage;