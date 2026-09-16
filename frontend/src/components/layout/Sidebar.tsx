import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileStack,
  PlusCircle,
  Users,
  ShieldCheck,
  LogOut,
  Database,
  ListChecks,
  Building2,
  CalendarClock,
  Send,
  Bell,
  History,
  BarChart3,
  Settings,
  UserCircle,
  Search,
  MessageSquareText,
  BookOpen,
  ClipboardList,
  Workflow,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, permissions, logout } = useAuth();


  const canApprove =
    permissions.peut_valider_hierarchie ||
    permissions.peut_valider_qualite ||
    permissions.peut_valider_prt ||
    permissions.peut_evaluer_impacts ||
    permissions.peut_administrer;

  const navItems = [
    {
      to: '/',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/approbations',
      label: 'File d\'approbation',
      icon: <ClipboardCheck className="w-4 h-4" />,
      visible: canApprove,
    },
    {
      to: '/demandes',
      label: 'Registre des demandes',
      icon: <FileStack className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/demandes/mes-demandes',
      label: 'Mes demandes',
      icon: <ClipboardList className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/demandes/recherche',
      label: 'Recherche',
      icon: <Search className="w-4 h-4" />,
      visible: permissions.peut_consulter || permissions.peut_administrer,
    },
    {
      to: '/avis-services',
      label: 'Avis des services',
      icon: <MessageSquareText className="w-4 h-4" />,
      visible: permissions.peut_evaluer_impacts || permissions.peut_administrer,
    },
    {
      to: '/demandes/en-attente',
      label: 'Demandes en attente',
      icon: <FileStack className="w-4 h-4" />,
      visible: canApprove,
    },
    {
      to: '/nouvelle-demande',
      label: 'Nouvelle demande',
      icon: <PlusCircle className="w-4 h-4" />,
      visible: permissions.peut_creer_demande,
      highlight: true,
    },
    {
      to: '/plans-action',
      label: 'Plans d\'action',
      icon: <ListChecks className="w-4 h-4" />,
      visible: permissions.peut_plans_action || permissions.peut_administrer,
    },
    {
      to: '/evaluations',
      label: 'Évaluations des services',
      icon: <Building2 className="w-4 h-4" />,
      visible: permissions.peut_evaluer_impacts || permissions.peut_administrer,
    },
    {
      to: '/reunions',
      label: 'Réunions',
      icon: <CalendarClock className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/diffusion',
      label: 'Diffusions',
      icon: <Send className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/historique',
      label: 'Historique',
      icon: <History className="w-4 h-4" />,
      visible: permissions.peut_historique || permissions.peut_administrer,
    },
    {
      to: '/statistiques',
      label: 'Statistiques',
      icon: <BarChart3 className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/admin/utilisateurs',
      label: 'Administration utilisateurs',
      icon: <Users className="w-4 h-4" />,
      visible: permissions.peut_administrer,
    },
    {
      to: '/admin/parametrage',
      label: 'Paramétrage',
      icon: <Settings className="w-4 h-4" />,
      visible: permissions.peut_administrer,
    },
    {
      to: '/admin/workflow',
      label: 'Workflow (circuit)',
      icon: <Workflow className="w-4 h-4" />,
      visible: permissions.peut_parametrages,
    },
    {
      to: '/admin/roles',
      label: 'Rôles & permissions',
      icon: <Shield className="w-4 h-4" />,
      visible: permissions.peut_administrer || permissions.peut_gestion_utilisateurs,
    },
    {
      to: '/profil',
      label: 'Mon profil',
      icon: <UserCircle className="w-4 h-4" />,
      visible: true,
    },
    {
      to: '/aide',
      label: 'Aide & tutoriels',
      icon: <BookOpen className="w-4 h-4" />,
      visible: true,
    },
  ];

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={cn(
          'fixed lg:static top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Logo */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-700/20">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">MÉDICIS</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  GxP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                Change Control • DCMEDICIS
              </p>
            </div>
          </div>
        </div>

        {/* Info DB & Conformité */}
        <div className="px-3.5 py-2.5 mx-3 mt-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5 text-teal-700 font-medium">
            <Database className="w-3.5 h-3.5" /> DCMEDICIS
          </span>
          <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> CFR 21 Part 11
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation principale
          </p>

          {navItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent',
                    item.highlight && !isActive && 'text-teal-700 font-medium'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
        </nav>

        {/* Footer profil utilisateur */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1">
            <span>Profil Actif</span>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-800 shrink-0">
              {currentUser.prenom[0]}
              {currentUser.nom[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {currentUser.prenom} {currentUser.nom}
              </p>
              <p className="text-[11px] text-teal-700 font-medium truncate">
                {currentUser.Role_user}
              </p>
            </div>
            <button
              onClick={() => logout()}
              title="Se déconnecter"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
