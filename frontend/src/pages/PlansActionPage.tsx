import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, PlanAction, StatutPlanAction } from '../types';
import { formatDateFr } from '../lib/utils';

interface PlanRow {
  plan: PlanAction;
  demande: Demande;
}

const STATUT_STYLE: Record<StatutPlanAction, string> = {
  en_cours: 'bg-amber-50 text-amber-800 border border-amber-200',
  terminée: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  en_retard: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const emptyForm = {
  numero_demande: 0,
  action_description: '',
  responsable: '',
  delai: '',
  action_qualipro: '',
  statut: 'en_cours' as StatutPlanAction,
};

export const PlansActionPage: React.FC = () => {
  const { success, error } = useToast();

  const [rows, setRows] = useState<PlanRow[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [statutFilter, setStatutFilter] = useState<'all' | StatutPlanAction>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const list = await apiClient.getDemandes();
      setDemandes(list);
      const collected: PlanRow[] = [];
      await Promise.all(
        list.map(async (d) => {
          const plans = await apiClient.getPlanActionsByDemande(d.numero_demande);
          plans.forEach((p) => collected.push({ plan: p, demande: d }));
        })
      );
      setRows(collected);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les plans d\'action.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filtered = rows.filter((r) => statutFilter === 'all' || r.plan.statut === statutFilter);

  const handleCreate = async () => {
    if (!form.numero_demande) {
      error('Demande requise', 'Veuillez associer une demande de changement.');
      return;
    }
    if (!form.action_description.trim()) {
      error('Description requise', 'Renseignez le contenu de l\'action.');
      return;
    }
    if (!form.responsable.trim()) {
      error('Responsable requis', 'Renseignez l\'email du responsable.');
      return;
    }
    setIsSubmitting(true);
    try {
      const toDate = form.delai
        ? (() => {
            const [y, m, d] = form.delai.split('-');
            return `${d}/${m}/${y}`;
          })()
        : null;
      await apiClient.createPlanAction({
        numero_demande: form.numero_demande,
        action_description: form.action_description.trim(),
        responsable: form.responsable.trim(),
        delai: toDate,
        statut: form.statut,
        action_qualipro: form.action_qualipro || null,
        date_creation: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        date_modification: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Action créée', "L'action a été ajoutée au plan d'action du changement.");
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadPlans();
    } catch (e) {
      console.error(e);
      error('Erreur', "Impossible de créer l'action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatut = async (row: PlanRow) => {
    const next: StatutPlanAction = row.plan.statut === 'terminée' ? 'en_cours' : 'terminée';
    try {
      await apiClient.updatePlanAction(row.plan.id_plan_action!, { statut: next });
      success('Statut mis à jour', next === 'terminée' ? 'Action marquée terminée.' : 'Action réouverte.');
      await loadPlans();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const columns: Column<PlanRow>[] = [
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
      header: 'Action',
      accessor: (row) => (
        <div className="min-w-[260px]">
          <p className="text-xs font-semibold text-slate-900 line-clamp-2">{row.plan.action_description}</p>
          {row.plan.action_qualipro && (
            <p className="text-[11px] text-indigo-700 font-mono mt-0.5">Qualipro : {row.plan.action_qualipro}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Responsable',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-slate-900 font-medium">{row.plan.responsable}</p>
          <p className="text-[11px] text-slate-500">{row.demande.sujet_changement}</p>
        </div>
      ),
    },
    {
      header: 'Délai',
      accessor: (row) => (
        <span className={`font-mono text-xs ${row.plan.delai && formatDateFr(row.plan.delai) !== '—' && new Date(String(row.plan.delai).split('/').reverse().join('-')).getTime() < new Date().getTime() && row.plan.statut !== 'terminée' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
          {formatDateFr(row.plan.delai)}
        </span>
      ),
    },
    {
      header: 'Statut',
      accessor: (row) => (
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[row.plan.statut]}`}>
          {row.plan.statut === 'en_cours' ? 'En cours' : row.plan.statut === 'terminée' ? 'Terminée' : 'En retard'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button
          variant={row.plan.statut === 'terminée' ? 'outline' : 'success'}
          size="sm"
          onClick={() => handleToggleStatut(row)}
          leftIcon={row.plan.statut === 'terminée' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        >
          {row.plan.statut === 'terminée' ? 'Réouvrir' : 'Clôturer'}
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans d'action"
        subtitle="Suivi des actions correctives et préventives liées aux changements (lien Qualipro)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Plans d\'action' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {filtered.length} action(s)
          </span>
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nouvelle action
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'en_cours', 'terminée', 'en_retard'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatutFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              statutFilter === s
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
            }`}
          >
            {s === 'all' ? 'Toutes' : s === 'en_cours' ? 'En cours' : s === 'terminée' ? 'Terminées' : 'En retard'}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(r) => `${r.plan.id_plan_action}`}
        searchableKey={(r) => `${r.plan.action_description} ${r.plan.responsable} ${r.plan.action_qualipro ?? ''} ${r.demande.numero_chronologique}`}
        searchPlaceholder="Rechercher une action, un responsable..."
        isLoading={isLoading}
        emptyTitle="Aucune action enregistrée pour ce filtre."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreate}
        title="Nouvelle action (Plan d'action)"
        variant="primary"
        confirmLabel="Créer l'action"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Demande de changement <span className="text-rose-600">*</span>
              </label>
              <select
                value={form.numero_demande}
                onChange={(e) => setForm({ ...form, numero_demande: Number(e.target.value) })}
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
                Description de l'action <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={form.action_description}
                onChange={(e) => setForm({ ...form, action_description: e.target.value })}
                placeholder="Décrivez l'action corrective / préventive..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Responsable (email) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  value={form.responsable}
                  onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  placeholder="utilisateur@medicis.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Délai limite</label>
                <input
                  type="date"
                  value={form.delai}
                  onChange={(e) => setForm({ ...form, delai: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Statut initial</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value as StatutPlanAction })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="en_cours">En cours</option>
                  <option value="en_retard">En retard</option>
                  <option value="terminée">Terminée</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">N° Qualipro</label>
                <input
                  type="text"
                  value={form.action_qualipro}
                  onChange={(e) => setForm({ ...form, action_qualipro: e.target.value })}
                  placeholder="AQC-2024-015"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                />
              </div>
            </div>

            {rows.filter((r) => r.plan.statut === 'en_retard').length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {rows.filter((r) => r.plan.statut === 'en_retard').length} action(s) en retard à surveiller.
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default PlansActionPage;