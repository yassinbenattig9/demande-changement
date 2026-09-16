import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { Demande, ServiceImpacte } from '../types';
import { formatDateFr } from '../lib/utils';

interface ImpactRow {
  impact: ServiceImpacte;
  demande: Demande;
}

export const EvaluationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [rows, setRows] = useState<ImpactRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('mine');
  const [isLoading, setIsLoading] = useState(true);

  const [activeImpact, setActiveImpact] = useState<ImpactRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadImpacts = async () => {
    setIsLoading(true);
    try {
      const list = await apiClient.getDemandes();
      const collected: ImpactRow[] = [];
      await Promise.all(
        list.map(async (d) => {
          const impacts = await apiClient.getServicesImpactesByDemande(d.numero_demande);
          impacts.forEach((i) => collected.push({ impact: i, demande: d }));
        })
      );
      setRows(collected);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les évaluations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImpacts();
  }, []);

  const displayed = rows.filter((r) => {
    if (filter === 'mine') return r.impact.email_cancernee === currentUser.email;
    if (filter === 'pending') return r.impact.email_cancernee === currentUser.email && r.impact.reponse !== 'oui';
    return true;
  });

  const handleOpenResponse = (row: ImpactRow) => {
    setActiveImpact(row);
    setCommentaire(row.impact.commentaire || '');
    setIsModalOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!activeImpact) return;
    if (!commentaire.trim()) {
      error('Commentaire requis', "L'évaluation d'impact doit être motivée par écrit.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.updateServiceImpact(activeImpact.impact.numero_demande, {
        service: activeImpact.impact.service,
        email_cancernee: activeImpact.impact.email_cancernee,
        reponse: 'oui',
        date_reponse: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        commentaire: commentaire.trim(),
        Intervenant: `${currentUser.prenom} ${currentUser.nom}`,
      });
      success('Réponse enregistrée', `Votre évaluation pour ${activeImpact.impact.service} a été transmise.`);
      setIsModalOpen(false);
      await loadImpacts();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer votre évaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<ImpactRow>[] = [
    {
      header: 'Demande',
      accessor: (row) => (
        <Link to={`/demandes/${row.demande.numero_demande}`} className="font-mono text-xs font-bold text-teal-700 hover:underline">
          {row.demande.numero_chronologique}
        </Link>
      ),
      sortable: true,
      className: 'w-28',
    },
    {
      header: 'Service',
      accessor: (row) => (
        <div className="min-w-[200px]">
          <p className="text-xs font-bold text-slate-900">{row.impact.service}</p>
          <p className="text-[11px] text-slate-500">
            {row.impact.fonction} • {row.impact.email_cancernee}
          </p>
        </div>
      ),
    },
    {
      header: 'Demandeur concerné',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-slate-900 font-medium">{row.demande.nom_demandeur}</p>
          <p className="text-[11px] text-slate-500 line-clamp-1">{row.demande.sujet_changement}</p>
        </div>
      ),
    },
    {
      header: 'État de la réponse',
      accessor: (row) => {
        const isDone = row.impact.reponse === 'oui';
        const isMine = row.impact.email_cancernee === currentUser.email;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                isDone
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isMine
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isDone ? 'Répondu (oui)' : isMine ? 'En attente de ma réponse' : 'En attente'}
            </span>
            {isMine && !isDone && (
              <Button variant="success" size="sm" onClick={() => handleOpenResponse(row)} leftIcon={<Send className="w-3.5 h-3.5" />}>
                Répondre
              </Button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Réponse / Intervenant',
      accessor: (row) => (
        <div className="text-[11px] text-slate-600 min-w-[180px]">
          {row.impact.commentaire ? (
            <p className="line-clamp-2 italic">« {row.impact.commentaire} »</p>
          ) : (
            <p className="text-slate-400">—</p>
          )}
          {row.impact.Intervenant && (
            <p className="text-slate-400 font-mono mt-0.5">{row.impact.Intervenant} • {formatDateFr(row.impact.date_reponse)}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Évaluations des services impactés"
        subtitle="Avis des départements sur l'impact technique, réglementaire et documentaire des changements."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Évaluations' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {rows.filter((r) => r.impact.email_cancernee === currentUser.email && r.impact.reponse !== 'oui').length} évaluation(s) à rendre
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {( [['mine', 'Mes évaluations'], ['pending', 'En attente'], ['all', 'Toutes']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              filter === key
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        data={displayed}
        columns={columns}
        keyExtractor={(r) => `${r.impact.id_impact}`}
        searchableKey={(r) => `${r.impact.service} ${r.impact.email_cancernee} ${r.demande.sujet_changement}`}
        searchPlaceholder="Rechercher par service, demandeur..."
        isLoading={isLoading}
        emptyTitle="Aucune évaluation à afficher pour ce filtre."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSubmitResponse}
        title={`Évaluation d'impact — ${activeImpact?.impact.service ?? ''}`}
        variant="success"
        confirmLabel="Transmettre la réponse (oui)"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="text-slate-500 block">Demande :</span>
              <strong className="text-slate-900">{activeImpact?.demande.sujet_changement}</strong>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeImpact?.demande.numero_chronologique} • {activeImpact?.impact.fonction}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Évaluation détaillée de l'impact (procédures, équipements, autorisations){' '}
                <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Décrivez l'impact sur vos activités, personnel, équipements ou autorisations..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center gap-2 text-[11px] text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
              Votre réponse sera consignée dans DCMEDICIS.dbo.Service_impactees avec votre identité et la date.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default EvaluationsPage; 