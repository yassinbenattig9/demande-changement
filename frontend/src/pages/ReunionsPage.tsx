import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Users } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Reunion } from '../types';
import { formatDateFr } from '../lib/utils';

const emptyForm = {
  date_reunion: '',
  lieu: '',
  ordre_du_jour: '',
  participants: '',
  demandes_discutees: '',
  compte_rendu: '',
};

export const ReunionsPage: React.FC = () => {
  const { success, error } = useToast();

  const [reunions, setReunions] = useState<Reunion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReunions = async () => {
    setIsLoading(true);
    try {
      setReunions(await apiClient.getReunions());
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les réunions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReunions();
  }, []);

  const handleCreate = async () => {
    if (!form.date_reunion) {
      error('Date requise', 'La date de réunion est obligatoire.');
      return;
    }
    if (!form.lieu.trim()) {
      error('Lieu requis', 'Le lieu de la réunion est obligatoire.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createReunion({
        date_reunion: (() => {
          const [y, m, d] = form.date_reunion.split('-');
          return `${d}/${m}/${y}`;
        })(),
        lieu: form.lieu.trim(),
        ordre_du_jour: form.ordre_du_jour.trim() || 'Non renseigné',
        participants: form.participants.trim() || 'À définir',
        demandes_discutees: form.demandes_discutees.trim() || '',
        compte_rendu: form.compte_rendu.trim() || '',
        date_creation: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Réunion enregistrée', 'La réunion a été ajoutée au registre DCMEDICIS.');
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadReunions();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de créer la réunion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Reunion>[] = [
    {
      header: 'Date',
      accessor: (r) => <span className="font-mono text-xs font-semibold text-slate-900">{formatDateFr(r.date_reunion, true)}</span>,
      sortable: true,
      className: 'w-40',
    },
    {
      header: 'Lieu',
      accessor: (r) => (
        <span className="text-xs text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-600" /> {r.lieu}
        </span>
      ),
    },
    {
      header: 'Ordre du jour',
      accessor: (r) => <p className="text-xs text-slate-700 line-clamp-2 min-w-[220px]">{r.ordre_du_jour}</p>,
    },
    {
      header: 'Participants',
      accessor: (r) => (
        <span className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" /> {r.participants}
        </span>
      ),
    },
    {
      header: 'Demandes discutées',
      accessor: (r) => <span className="font-mono text-xs text-teal-700">{r.demandes_discutees || '—'}</span>,
    },
    {
      header: 'Compte-rendu',
      accessor: (r) => <p className="text-[11px] text-slate-600 italic line-clamp-2 min-w-[200px]">{r.compte_rendu || '—'}</p>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réunions de suivi des changements"
        subtitle="Registre des comités de revue des changements en cours (PRT / comité de pilotage)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Réunions' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {reunions.length} réunion(s)
          </span>
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Planifier une réunion
          </Button>
        }
      />

      <DataTable
        data={reunions}
        columns={columns}
        keyExtractor={(r) => `${r.id_reunion}`}
        searchableKey="ordre_du_jour"
        searchPlaceholder="Rechercher par ordre du jour, lieu, participants..."
        isLoading={isLoading}
        emptyTitle="Aucune réunion enregistrée pour le moment."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreate}
        title="Nouvelle réunion"
        variant="primary"
        confirmLabel="Enregistrer la réunion"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Date de la réunion <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={form.date_reunion}
                  onChange={(e) => setForm({ ...form, date_reunion: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Lieu <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.lieu}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                  placeholder="Salle de réunion / Visioconférence"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ordre du jour</label>
              <textarea
                rows={3}
                value={form.ordre_du_jour}
                onChange={(e) => setForm({ ...form, ordre_du_jour: e.target.value })}
                placeholder="Points à examiner (revue des demandes, impacts, plans d'action...)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Participants</label>
                <input
                  type="text"
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                  placeholder="Responsable de changement, QA, PRT..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Demandes discutées</label>
                <input
                  type="text"
                  value={form.demandes_discutees}
                  onChange={(e) => setForm({ ...form, demandes_discutees: e.target.value })}
                  placeholder="N° chrono, ex : 24/002, 24/005"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Compte-rendu</label>
              <textarea
                rows={3}
                value={form.compte_rendu}
                onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })}
                placeholder="Décisions et conclusions de la réunion..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ReunionsPage;