import React from 'react';
import { ShieldCheck, Mail, Building2, UserCog, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { ACCEES_DEFINITIONS, SITE_CODES_LABELS, ROLE_SPECIAL_LABELS, getAcceesChar } from '../types';

export const ProfilPage: React.FC = () => {
  const { currentUser } = useAuth();

  const flagsWithPos = ACCEES_DEFINITIONS.map((def) => ({
    def,
    enabled: getAcceesChar(currentUser.Accees, def.position) === '1',
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Mon profil GxP"
        subtitle="Identité, rôle et droits d'accès (Accees) de l'utilisateur connecté."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Mon profil' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Profil électronique 21 CFR Part 11
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-teal-700/20">
              {currentUser.prenom[0]}
              {currentUser.nom[0]}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-3">
              {currentUser.prenom} {currentUser.nom}
            </h2>
            <p className="text-xs font-semibold text-teal-700">{currentUser.Role_user}</p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
            <p className="flex items-center gap-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> {currentUser.service} — {currentUser.fonction}
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <UserCog className="w-3.5 h-3.5 text-slate-400" /> Site :{' '}
              {SITE_CODES_LABELS[Number(currentUser.Site)] ? `${currentUser.Site} — ${SITE_CODES_LABELS[Number(currentUser.Site)]}` : currentUser.Site || '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {currentUser.signataire && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Signataire habilité
              </span>
            )}
            {currentUser.DirecteurAQ && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Directeur QA
              </span>
            )}
            {currentUser.MemberAQ && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Membre AQ
              </span>
            )}
            {currentUser.Role_user && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
               {ROLE_SPECIAL_LABELS[Number(currentUser.Role_user)] ?? currentUser.Role_user} ({currentUser.Role_user})
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Matrice des droits — Accees</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chaîne de {currentUser.Accees.length} positions stockée dans DCMEDICIS.dbo.Utilisateurs.Accees.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <code className="font-mono text-xs tracking-widest break-all">{currentUser.Accees}</code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flagsWithPos.map(({ def, enabled }, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                  enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 truncate">{def.label}</span>
                </div>
                {enabled && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilPage;