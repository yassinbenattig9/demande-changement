import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Mail } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Utilisateur } from '../types';

export const ApprobateursPage: React.FC = () => {
  const { error } = useToast();

  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadApprobateurs = async () => {
    setIsLoading(true);
    try {
      setUsers(await apiClient.getApprobateurs());
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les approbateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprobateurs();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approbateurs habilités GxP"
        subtitle="Utilisateurs autorisés à signer les étapes d'acceptation / approbation du workflow."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Approbateurs' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> {users.length} habilité(s)
          </span>
        }
      />

      {isLoading ? (
        <p className="text-xs text-slate-400 text-center py-10">Chargement des approbateurs...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id_user} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-sm text-teal-800">
                  {u.prenom[0]}
                  {u.nom[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {u.prenom} {u.nom}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium">{u.Role_user}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {u.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> {u.service} — {u.fonction}
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${u.signataire ? 'text-emerald-600' : 'text-slate-300'}`} />
                  {u.signataire ? 'Signataire électronique habilité' : 'Non signataire'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {u.DirecteurAQ && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Directeur QA
                  </span>
                )}
                {u.MemberAQ && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Membre AQ
                  </span>
                )}
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Site {u.Site || '—'}
                </span>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-xs text-slate-400 col-span-full text-center py-10">
              Aucun approbateur habilité pour le moment.
            </p>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
        Pour chaque demande, la liste d'approbation se construit à partir des responsables désignés dans
        DCMEDICIS.dbo.Approb_Fonction et des profils marqués comme signataires. Modifiez les droits depuis
        l'Administration utilisateurs.
      </div>
    </div>
  );
};
export default ApprobateursPage;