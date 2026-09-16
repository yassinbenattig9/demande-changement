import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { TabDiversItem } from '../types';

const CATEGORIES: { key: string; label: string; placeholder: string }[] = [
  { key: 'site', label: 'Sites', placeholder: 'JO / EF / SS' },
  { key: 'type', label: 'Types de changement', placeholder: 'Technique / Documentation...' },
  { key: 'produit', label: 'Produits / Spécialités', placeholder: 'Designation' },
  { key: 'service', label: 'Services', placeholder: 'Assurance Qualité...' },
  { key: 'fonction', label: 'Fonctions', placeholder: 'Responsable de service...' },
];

const emptyForm = { parametre: 'site', designation: '', code: '' };

export const ParametragePage: React.FC = () => {
  const { success, error } = useToast();

  const [active, setActive] = useState('site');
  const [items, setItems] = useState<TabDiversItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      setItems(await apiClient.getTabDivers(active as any));
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger le référentiel.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [active]);

  const visible = items.filter(
    (i) =>
      !search.trim() ||
      i.designation.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.designation.trim()) {
      error('Designation requise', 'Renseignez la désignation de l\'élément.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.saveTabDivers({
        parametre: form.parametre,
        designation: form.designation.trim(),
        code: form.code.trim() || form.designation.trim(),
      });
      success('Élément ajouté', 'Le référentiel DCMEDICIS.dbo.Tab_Divers a été mis à jour.');
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadItems();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de créer l\'élément.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: TabDiversItem) => {
    try {
      await apiClient.removeTabDivers(item.id_tab_divers!);
      success('Élément supprimé', `${item.designation} a été retiré du référentiel.`);
      await loadItems();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de supprimer l\'élément.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramétrage du référentiel (Tab_Divers)"
        subtitle="Gestion des listes de choix alimentant les formulaires Change Control."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Paramétrage' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setForm({ ...emptyForm, parametre: active });
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter un élément
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              active === c.key
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            {CATEGORIES.find((c) => c.key === active)?.label}{' '}
            <span className="text-xs font-mono text-slate-400">({visible.length})</span>
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-8">Chargement du référentiel...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((item) => (
              <div
                key={item.id_tab_divers}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{item.designation}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">Code : {item.code}</p>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-slate-300 hover:text-rose-600 transition-colors shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="text-xs text-slate-400 col-span-full text-center py-8">
                Aucun élément pour cette catégorie.
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreate}
        title="Nouvel élément du référentiel"
        variant="primary"
        confirmLabel="Ajouter"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Catégorie</label>
              <select
                value={form.parametre}
                onChange={(e) => setForm({ ...form, parametre: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Designation <span className="text-rose-600">*</span>
              </label>
              <input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder={CATEGORIES.find((c) => c.key === form.parametre)?.placeholder}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Code (libre)</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Laissé vide = designation"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>
          </div>
        }
      />
    </div>
  );
};
export default ParametragePage;