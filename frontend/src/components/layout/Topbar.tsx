import React, { useState } from 'react';
import {
  Menu,
  Search,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useNavigate } from 'react-router-dom';

export const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { currentUser, permissions } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/demandes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/95 border-b border-slate-200 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      {/* Côté gauche : Bouton Menu + Recherche rapide */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par n° chrono (ex: 24/018), produit, demandeur..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 transition-all"
          />
        </form>
      </div>

      {/* Côté droit : Indicateurs & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Badge rôle & GxP */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-700">{currentUser.service}</span>
          <span className="text-slate-400">•</span>
          <span className="text-teal-700 font-semibold">{currentUser.Role_user}</span>
        </div>

        {/* Bouton Nouvelle Demande */}
        {permissions.peut_creer_demande && (
          <button
            onClick={() => navigate('/nouvelle-demande')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-teal-700/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvelle demande</span>
          </button>
        )}

        {/* Notifications */}
        <NotificationsDropdown email={currentUser.email} />

        {/* Avatar Profil */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs"
            title={`${currentUser.prenom} ${currentUser.nom} (${currentUser.email})`}
          >
            {currentUser.prenom[0]}
            {currentUser.nom[0]}
          </div>
        </div>
      </div>
    </header>
  );
};
