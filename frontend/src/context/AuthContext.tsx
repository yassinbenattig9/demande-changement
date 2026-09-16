import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Utilisateur, UserPermissions, parseServerPermissions, AuthSessionInfo } from '../types';
import { apiClient } from '../lib/api-client';

interface AuthContextType {
  currentUser: Utilisateur;
  permissions: UserPermissions;
  serverPermissions: string[];
  serverRoles: string[];
  isAuthenticated: boolean;
  isInitialized: boolean;
  logout: () => void;
  login: (email: string, password?: string) => Promise<boolean>;
  updateCurrentUser: (patch: Partial<Utilisateur>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS: Utilisateur = {
  id_user: 0,
  email: '',
  prenom: '',
  nom: '',
  service: '',
  fonction: '',
  signataire: null,
  Accees: '0000000000000000000000',
  Site: 'JO',
  DirecteurAQ: false,
  MemberAQ: false,
  Role_user: '',
  est_actif: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Utilisateur>(ANONYMOUS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [serverPermissions, setServerPermissions] = useState<string[]>([]);
  const [serverRoles, setServerRoles] = useState<string[]>([]);
  const [siteAccess, setSiteAccess] = useState<Record<string, string>>({});

  const applySession = useCallback((session: Utilisateur & AuthSessionInfo) => {
    setCurrentUser(session);
    setServerPermissions(Array.isArray(session.permissions) ? session.permissions : []);
    setServerRoles(Array.isArray(session.roles) ? session.roles : []);
    setSiteAccess(session.siteAccess || {});
    setIsAuthenticated(true);
    localStorage.setItem('medicis_gxp_current_user_email', session.email);
  }, []);

  useEffect(() => {
    apiClient.getCurrentUser()
      .then((user) => {
        if (user) {
          applySession(user);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setIsInitialized(true));
  }, [applySession]);

  // C5 : les permissions viennent du serveur (RBAC), plus de parseAccees au runtime.
  const permissions = useMemo(
    () => parseServerPermissions(serverPermissions, siteAccess),
    [serverPermissions, siteAccess]
  );

  const login = useCallback(
    async (email: string, password?: string): Promise<boolean> => {
      try {
        const session = await apiClient.authLogin(email, password);
        if (session && session.est_actif !== false) {
          applySession(session);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await apiClient.logout().catch(() => {});
    setCurrentUser(ANONYMOUS);
    setIsAuthenticated(false);
    setServerPermissions([]);
    setServerRoles([]);
    setSiteAccess({});
    localStorage.removeItem('medicis_gxp_current_user_email');
    localStorage.setItem('medicis_gxp_is_authenticated', 'false');
  }, []);

  const updateCurrentUser = useCallback((patch: Partial<Utilisateur>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('medicis_gxp_current_user_email', updated.email);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser, permissions, serverPermissions, serverRoles, isAuthenticated, isInitialized, logout, login, updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé au sein de AuthProvider');
  return ctx;
};
