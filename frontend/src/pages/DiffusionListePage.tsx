import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Send, Clock3, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, normalizeWorkflowState } from '../types';
import { formatDateFr } from '../lib/utils';

interface DiffusibleRow {
  demande: Demande;
  nbDiffusions: number;
}

export const DiffusionListePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [rows, setRows] = useState<DiffusibleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [active, setActive] = useState<DiffusibleRow | null>(null);
  const [email, setEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const demandes = await apiClient.getDemandes();
      const diffusions = await apiClient.getDiffusions();
      const diffusibles: DiffusibleRow[] = [];
      await Promise.all(
        demandes.map(async (d) => {
          if (normalizeWorkflowState(d.etat_demande) !== 'clôturée_validée') return;
          const byDemande = (await apiClient.getDiffusionsByDemande(d.numero_demande)) ?? [];
          diffusibles.push({
            demande: d,
            nbDiffusions: byDemande.length,
          });
        })
      );
      setRows(diffusibles);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la liste à diffuser.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!active) return;
    if (!email.trim() || !email.includes('@')) {
      error('Email requis', 'Renseignez une adresse email valide.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createDiffusion({
        Num_Dem: active.demande.numero_demande,
        Email: email.trim(),
        Date_Diffusion: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Diffusion enregistrée', `Avis diffusé à ${email.trim()} pour ${active.demande.numero_chronologique}.`);
      setEmail('');
      setIsModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer la diffusion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<DiffusibleRow>[] = [
    {
      header: 'N° Chrono',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/demandes/${row.demande.numero_demande}`)}
          className="font-mono text-xs font-bold text-teal-700 hover:underline"
        >
          {row.demande.numero_chronologique}
        </button>
      ),
      sortable: true,
      className: 'w-24',
    },
    {
      header: 'Avis validé à diffuser',
      accessor: (row) => (
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{row.demande.sujet_changement}</p>
          <p className="text-[11px] text-slate-500">
            Classement : {row.demande.classement_changement} • Clôturée le{' '}
            {formatDateFr(row.demande.date_clôture)}
          </p>
        </div>
      ),
    },
    {
      header: 'Diffusions effectuées',
      accessor: (row) => (
        <span className="text-xs font-semibold">
          {row.nbDiffusions > 0 ? (
            <span className="text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {row.nbDiffusions} diffusion(s)
            </span>
          ) : (
            <span className="text-amber-700 flex items-center gap-1.5">
              <Clock3 className="w-4 h-4" /> Non diffusée
            </span>
          )}
        </span>
      ),
    },
    {
      header: '',
      accessor: (row) => (
        <button
          onClick={() => {
            setActive(row);
            setEmail('');
            setIsModalOpen(true);
          }}
          className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Diffuser
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liste à Diffuser"
        subtitle="Avis de changement clôturés et validés en attente d'une diffusion aux destinataires concernés."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Diffusions', href: '/diffusion' }, { label: 'Liste à diffuser' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {rows.filter((r) => r.nbDiffusions === 0).length} à diffuser
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/diffusion')} leftIcon={<Send className="w-4 h-4" />}>
            Registre des diffusions
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(r) => r.demande.numero_demande}
        searchableKey={(r) => `${r.demande.numero_chronologique} ${r.demande.sujet_changement}`}
        searchPlaceholder="Rechercher une demande à diffuser..."
        isLoading={isLoading}
        emptyTitle="Aucune demande clôturée-validée n'attend une diffusion."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAdd}
        title={`Diffusion de l'avis — ${active?.demande.numero_chronologique ?? ''}`}
        variant="success"
        confirmLabel="Enregistrer la diffusion"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-900">{active?.demande.sujet_changement}</strong>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Destinataire (email) <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="destinataire@medicis.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Un lien de consultation {active?.demande ? `${active.demande.numero_chronologique} : ` : ''}sera envoyé ; la diffusion sera consignée dans DCMEDICIS.dbo.Diffusions.
            </p>
            <Link to={`/diffusion/demande/${active?.demande.numero_demande ?? ''}`} className="text-xs text-teal-700 font-semibold hover:underline">
              Voir la liste des destinataires pour cette demande →
            </Link>
          </div>
        }
      />
    </div>
  );
};

export default DiffusionListePage;