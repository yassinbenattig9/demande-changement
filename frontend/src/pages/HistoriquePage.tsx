import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, Column } from '../components/ui/DataTable';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { HistoriqueAudit } from '../types';
import { formatDateFr } from '../lib/utils';

export const HistoriquePage: React.FC = () => {
  const { error } = useToast();

  const [events, setEvents] = useState<HistoriqueAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      setEvents(await apiClient.getAuditTrail());
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger le journal d\'audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const columns: Column<HistoriqueAudit>[] = [
    {
      header: 'Date',
      accessor: (e) => <span className="font-mono text-xs text-slate-700 whitespace-nowrap">{formatDateFr(e.date, true)}</span>,
      sortable: true,
      className: 'w-40',
    },
    {
      header: 'N° Chrono',
      accessor: (e) => <span className="font-mono text-xs font-bold text-teal-700">{e.numero_chronologique || 'Global'}</span>,
      sortable: true,
      className: 'w-24',
    },
    {
      header: 'Utilisateur',
      accessor: (e) => <span className="text-xs text-slate-800 font-medium">{e.utilisateur}</span>,
    },
    {
      header: 'Action',
      accessor: (e) => <span className="text-xs font-semibold text-slate-900 min-w-[220px]">{e.action}</span>,
    },
    {
      header: 'Page source',
      accessor: (e) => <span className="font-mono text-[11px] text-slate-500">{e.page_source}</span>,
    },
    {
      header: 'Commentaire',
      accessor: (e) => <p className="text-[11px] text-slate-600 italic line-clamp-2 min-w-[220px]">« {e.commentaire} »</p>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piste d'Audit — Historique"
        subtitle="Journal immuable des transactions GxP consignées dans DCMEDICIS.dbo.historique (conforme 21 CFR Part 11)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Historique' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> {events.length} événement(s)
          </span>
        }
      />

      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-900 leading-relaxed">
          Ce journal est inaltérable : chaque action est horodatée, attribuée à un utilisateur identifié,
          sourcée vers la page d'origine et reliée au numéro chronologique de la demande. Toute modification
          d'une décision enregistrée passera par un nouvel événement d'audit.
        </p>
      </div>

      <DataTable
        data={events}
        columns={columns}
        keyExtractor={(e) => `${e.id_historique ?? `${e.date}-${e.utilisateur}-${e.action}`}`}
        searchableKey="action"
        searchPlaceholder="Rechercher une action, un utilisateur, un n° chrono..."
        isLoading={isLoading}
        emptyTitle="Aucun événement enregistré pour le moment."
      />
    </div>
  );
};

export default HistoriquePage;