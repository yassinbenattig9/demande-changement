import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Building2, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { Demande, ServiceImpacte, normalizeWorkflowState } from '../types';
import { formatDateFr } from '../lib/utils';

interface ImpactRow {
  impact: ServiceImpacte;
  demande: Demande;
}

export const AvisServicesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [rows, setRows] = useState<ImpactRow[]>([]);
  const [scope, setScope] = useState<'tous' | 'minimum' | 'en-attente'>('tous');
  const [isLoading, setIsLoading] = useState(true);

  const [activeRow, setActiveRow] = useState<ImpactRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRows = async () => {
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
      error('Erreur', 'Impossible de charger les avis des services.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const isWorkflowOpen = (d: Demande) => {
    const s = normalizeWorkflowState(d.etat_demande);
    return !['clôturée_validée', 'refusée', 'demande_incomplète'].includes(s);
  };

  const displayed = rows.filter((r) => {
    if (scope === 'en-attente') return isWorkflowOpen(r.demande) && r.impact.reponse !== 'oui';
    if (scope === 'minimum') return r.demande.nbr_reponse_services < 1 && isWorkflowOpen(r.demande);
    return true;
  });

  const handleOpen = (r: ImpactRow) => {
    if (r.impact.reponse === 'oui') return;
    setActiveRow(r);
    setCommentaire(r.impact.commentaire || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeRow) return;
    if (!commentaire.trim()) {
      error('Avis requis', 'Vous devez rédiger un avis détaillé pour répondre.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.updateServiceImpact(activeRow.impact.numero_demande, {
        service: activeRow.impact.service,
        email_cancernee: activeRow.impact.email_cancernee,
        reponse: 'oui',
        date_reponse: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        commentaire: commentaire.trim(),
        Intervenant: `${currentUser.prenom} ${currentUser.nom}`,
      });
      success('Avis transmis', `L'avis du service ${activeRow.impact.service} a été consigné.`);
      setIsModalOpen(false);
      await loadRows();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer l\'avis.');
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
      className: 'w-24',
    },
    {
      header: 'Service impacté',
      accessor: (row) => (
        <div className="min-w-[200px]">
          <p className="text-xs font-bold text-slate-900">{row.impact.service}</p>
          <p className="text-[11px] text-slate-500">{row.impact.fonction} • {row.impact.email_cancernee}</p>
        </div>
      ),
    },
    {
      header: 'Objet du changement',
      accessor: (row) => (
        <div className="min-w-[220px]">
          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{row.demande.sujet_changement}</p>
          <p className="text-[11px] text-slate-500">
            {row.demande.type_changement} • {row.demande.site}
          </p>
        </div>
      ),
    },
    {
      header: 'Réponse',
      accessor: (row) => {
        const mine = row.impact.email_cancernee === currentUser.email;
        const done = row.impact.reponse === 'oui';
        return (
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                done
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : mine
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {done ? 'Répondu' : mine ? "M'incombe" : 'En attente'}
            </span>
            {mine && !done && (
              <Button variant="success" size="sm" onClick={() => handleOpen(row)} leftIcon={<Send className="w-3.5 h-3.5" />}>
                Saisir l'avis
              </Button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Avis',
      accessor: (row) => (
        <div className="text-[11px] text-slate-600 max-w-[240px]">
          {row.impact.commentaire ? (
            <>
              <p className="line-clamp-2 italic">« {row.impact.commentaire} »</p>
              <p className="font-mono text-slate-400 mt-0.5">
                {row.impact.Intervenant ?? '—'} • {formatDateFr(row.impact.date_reponse)}
              </p>
            </>
          ) : (
            <p className="text-slate-400">Aucun avis pour le moment.</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis & Actions des Services"
        subtitle="Recueil des avis des services impactés (Service_impactees) : oui / non répondu, intervenant et date."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Avis des services' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {rows.filter((r) => r.impact.email_cancernee === currentUser.email && r.impact.reponse !== 'oui').length} avis à rendre
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {( [['tous', 'Tous les avis'], ['en-attente', 'En attente'], ['minimum', 'Impacts non couverts']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setScope(key)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              scope === key
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
        searchableKey={(r) => `${r.impact.service} ${r.impact.email_cancernee} ${r.demande.sujet_changement} ${r.demande.numero_chronologique}`}
        searchPlaceholder="Rechercher par service, demandeur, numéro..."
        isLoading={isLoading}
        emptyTitle={
          scope === 'minimum'
            ? 'Toutes les demandes ouvertes disposent d\'au moins un avis de service.'
            : 'Aucun avis de service à afficher.'
        }
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSubmit}
        title={`Avis du service — ${activeRow?.impact.service ?? ''}`}
        variant="success"
        confirmLabel="Transmettre l'avis (oui)"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="flex items-center gap-1.5 text-slate-500">
                <FileText className="w-3.5 h-3.5" /> Demande concernée
              </p>
              <strong className="text-slate-900">{activeRow?.demande.sujet_changement}</strong>
              <p className="text-[11px] text-slate-500">
                {activeRow?.demande.numero_chronologique} • {activeRow?.impact.fonction}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Avis & actions à réaliser <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Impact sur vos activités, actions correctives nécessaires, délais..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center gap-2 text-[11px] text-teal-900">
              <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
              Renseigné dans DCMEDICIS.dbo.Service_impactees avec identité, fonction et horodatage.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default AvisServicesPage;