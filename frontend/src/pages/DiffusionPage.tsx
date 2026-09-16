import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Mail } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, Diffusion } from '../types';
import { formatDateFr } from '../lib/utils';

interface DiffusionRow {
  diffusion: Diffusion;
  demande?: Demande;
}

const emptyForm = { Num_Dem: 0, Email: '', Date_Diffusion: '' };

export const DiffusionPage: React.FC = () => {
  const { success, error } = useToast();

  const [rows, setRows] = useState<DiffusionRow[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDiffusions = async () => {
    setIsLoading(true);
    try {
      const demandesList = await apiClient.getDemandes();
      setDemandes(demandesList);
      const diffs = await apiClient.getDiffusions();
      setRows(
        diffs.map((d) => ({
          diffusion: d,
          demande: demandesList.find((x) => x.numero_demande === d.Num_Dem),
        }))
      );
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les diffusions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiffusions();
  }, []);

  const handleCreate = async () => {
    if (!form.Num_Dem) {
      error('Demande requise', 'Sélectionnez une demande clôturée à diffuser.');
      return;
    }
    if (!form.Email.trim() || !form.Email.includes('@')) {
      error('Email requis', 'Renseignez une adresse de diffusion valide.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createDiffusion({
        Num_Dem: form.Num_Dem,
        Email: form.Email.trim(),
        Date_Diffusion: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Diffusion envoyée', "L'avis de changement a été diffusé au destinataire.");
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadDiffusions();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer la diffusion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<DiffusionRow>[] = [
    {
      header: 'Demande',
      accessor: (row) =>
        row.demande ? (
          <Link to={`/demandes/${row.demande.numero_demande}`} className="font-mono text-xs font-bold text-teal-700 hover:underline">
            {row.demande.numero_chronologique}
          </Link>
        ) : (
          <span className="font-mono text-xs text-slate-500">#{row.diffusion.Num_Dem}</span>
        ),
      sortable: true,
      className: 'w-28',
    },
    {
      header: 'Objet diffusé',
      accessor: (row) => (
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold text-slate-900 line-clamp-1">
            {row.demande?.sujet_changement ?? `Demande #${row.diffusion.Num_Dem}`}
          </p>
          {row.demande && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Avis de changement de rang : {row.demande.classement_changement}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Destinataire',
      accessor: (row) => (
        <span className="text-xs text-slate-800 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" /> {row.diffusion.Email}
        </span>
      ),
    },
    {
      header: 'Diffusé le',
      accessor: (row) => <span className="font-mono text-xs text-slate-700">{formatDateFr(row.diffusion.Date_Diffusion, true)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diffusions des avis de changement"
        subtitle="Enregistrement des envois d'avis aux destinataires (services, autorités, partenaires)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Diffusions' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {rows.length} diffusion(s)
          </span>
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Diffuser un avis
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(r) => `${r.diffusion.id_diffusion}`}
        searchableKey={(r) => `${r.diffusion.Email} ${r.demande?.sujet_changement ?? ''} ${r.demande?.numero_chronologique ?? ''}`}
        searchPlaceholder="Rechercher par destinataire, demande..."
        isLoading={isLoading}
        emptyTitle="Aucune diffusion enregistrée pour le moment."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreate}
        title="Nouvelle diffusion d'avis de changement"
        variant="primary"
        confirmLabel="Enregistrer la diffusion"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Demande concernée <span className="text-rose-600">*</span>
              </label>
              <select
                value={form.Num_Dem}
                onChange={(e) => setForm({ ...form, Num_Dem: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value={0}>Sélectionner...</option>
                {demandes.map((d) => (
                  <option key={d.numero_demande} value={d.numero_demande}>
                    {d.numero_chronologique} — {d.sujet_changement}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Destinataire (email) <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={form.Email}
                onChange={(e) => setForm({ ...form, Email: e.target.value })}
                placeholder="destinataire@medicis.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default DiffusionPage;