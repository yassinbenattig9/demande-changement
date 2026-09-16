import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Workflow,
  Plus,
  Send,
  Settings2,
  Users,
  Mail,
  ListChecks,
  Trash2,
  Save,
  ArrowRight,
  FileStack,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { cn } from '../lib/utils';
import {
  WorkflowDetail,
  WorkflowEtape,
  WorkflowEtapeApprobateur,
  WorkflowConfig,
  WorkflowStrategie,
  WorkflowModeEtape,
} from '../types';

const STRATEGIE_LABELS: Record<string, string> = {
  tous: 'Tous les approbateurs',
  au_moins_un: 'Au moins un',
  majorite: 'Majorité',
};

const MODE_LABELS: Record<string, string> = {
  sequence: 'Séquence stricts (1 → 2 → 3…)',
  parallele: 'Parallèle (tous en même temps)',
};

/** Catalogue des approbateurs possibles (permissions du RBAC). */
const ROLE_REFERENCES = [
  { code: 'approbation.responsable_service', label: 'Responsable de service' },
  { code: 'approbation.charge_changement', label: 'Chargé de changement' },
  { code: 'approbation.responsable_changement', label: 'Responsable de changement' },
  { code: 'approbation.prt', label: 'Comité PRT' },
  { code: 'approbation.directeur_qualite', label: 'Directeur Qualité' },
  { code: 'avis_services', label: 'Avis des services' },
];

const etapePriority = (str: string) => (str === 'etape_submission' ? 0 : str === 'etape_cloturee' ? 99 : 1);

interface DraftApprobateur {
  key: string;
  type: 'role' | 'email';
  id_reference: string;
  obligatoire: boolean;
}

const toDrafts = (appr: WorkflowEtapeApprobateur[]): DraftApprobateur[] =>
  appr.map((a) => ({
    key: `${a.id_approbateur}-${Math.random().toString(36).slice(2, 7)}`,
    type: a.type === 'email' ? 'email' : 'role',
    id_reference: a.id_reference,
    obligatoire: a.obligatoire !== 0,
  }));

export const WorkflowAdminPage: React.FC = () => {
  const { success, error } = useToast();
  const { serverPermissions } = useAuth();

  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [active, setActive] = useState<WorkflowDetail | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // État d'édition : étage en cours de modification
  const [editingEtape, setEditingEtape] = useState<WorkflowEtape | null>(null);
  const [editStrategy, setEditStrategy] = useState<WorkflowStrategie>('tous');
  const [editMode, setEditMode] = useState<WorkflowModeEtape>('parallele');
  const [editMin, setEditMin] = useState(0);
  const [drafts, setDrafts] = useState<DraftApprobateur[]>([]);

  const canParam = serverPermissions.includes('parametrages');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const bundle = await apiClient.getWorkflowAdmin();
      setConfigs(bundle.configs);
      setActive(bundle.active);
      const focus = bundle.active;
      if (focus) {
        setSelectedVersion(focus);
      } else if (bundle.configs[0]?.id_workflow && bundle.configs[0].versions?.length) {
        const first = await apiClient.getWorkflowAdmin();
        setSelectedVersion(first.active);
      }
      setEditingEtape(null);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la configuration du workflow.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const openEtapeEditor = (etape: WorkflowEtape) => {
    setEditingEtape(etape);
    setEditStrategy(etape.strategie || 'tous');
    setEditMode(etape.mode || 'parallele');
    setEditMin(Number(etape.min_decisions) || 0);
    setDrafts(toDrafts(etape.approbateurs || []));
  };

  const addDraft = (type: 'role' | 'email') => {
    setDrafts((d) => [
      ...d,
      {
        key: `new-${Math.random().toString(36).slice(2, 7)}`,
        type,
        id_reference: type === 'role' ? ROLE_REFERENCES[0].code : '',
        obligatoire: true,
      },
    ]);
  };

  const patchDraft = (key: string, patch: Partial<DraftApprobateur>) => {
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const removeDraft = (key: string) => {
    setDrafts((d) => d.filter((x) => x.key !== key));
  };

  const handleCreateDraft = async () => {
    const cfg = configs[0];
    if (!cfg) return;
    try {
      const newVersion = await apiClient.createWorkflowVersion(cfg.id_workflow);
      success('Brouillon créé', `Version numéro ${newVersion.numero} prête à configurer.`);
      await load();
      setSelectedVersion(newVersion);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de créer la version brouillon.');
    }
  };

  const handlePublish = async () => {
    const cfg = configs[0];
    if (!cfg || !selectedVersion) return;
    if (selectedVersion.statut === 'publiee') {
      error('Déjà publiée', 'Cette version est déjà la version active.');
      return;
    }
    try {
      const pub = await apiClient.publishWorkflowVersion(cfg.id_workflow, selectedVersion.id_version);
      success('Version publiée', `La version ${pub.numero} est désormais active pour les nouvelles demandes.`);
      await load();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de publier cette version.');
    }
  };

  const handleSelectVersion = async (idVersion: number) => {
    try {
      const detail = await apiClient.getWorkflowVersionDetail(idVersion);
      if (detail) {
        setSelectedVersion(detail);
      } else {
        error('Introuvable', 'La version demandée est introuvable ou inaccessible.');
      }
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la version demandée.');
    }
  };

  const handleSaveEtape = async () => {
    if (!selectedVersion || !editingEtape) return;
    const cleaned = drafts.map((d, i) => ({
      type: d.type,
      id_reference: d.id_reference.trim(),
      ordre: i + 1,
      obligatoire: d.obligatoire ? 1 : 0,
    }));
    if (cleaned.some((c) => !c.id_reference)) {
      error('Approbateur incomplet', 'Chaque approbateur doit avoir une référence (rôle ou email).');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.updateStageApprovers(selectedVersion.id_version, editingEtape.code, cleaned, {
        strategie: editStrategy,
        mode: editMode,
        min_decisions: editStrategy === 'majorite' ? Math.max(1, editMin) : 0,
      });
      success('Étape enregistrée', `L'étape « ${editingEtape.libelle} » a été mise à jour.`);
      await load();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer l\'étape.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedEtapes = useMemo(() => {
    if (!selectedVersion) return [];
    return [...selectedVersion.etapes].sort((a, b) => a.ordre - b.ordre || etapePriority(a.code) - etapePriority(b.code) || a.code.localeCompare(b.code));
  }, [selectedVersion]);

  const isEditableVersion =
    selectedVersion && selectedVersion.statut === 'brouillon' && canParam;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circuit de validation — Workflow configurable"
        subtitle="Configurez les étapes d'approbation du Change Control : ordre (séquence ou parallèle), stratégie de décision et approbateurs. Seules les nouvelles demandes utilisent la version publiée."
        badge={
          active ? (
            <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
              Version active n°{active.numero}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
              Aucun workflow publié
            </span>
          )
        }
        actions={
          <div className="flex items-center gap-2.5">
            {canParam && (
              <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleCreateDraft}>
                Nouvelle version (brouillon)
              </Button>
            )}
            {canParam && selectedVersion?.statut === 'brouillon' && (
              <Button size="sm" leftIcon={<Send className="w-4 h-4" />} onClick={handlePublish}>
                Publier la version {selectedVersion.numero}
              </Button>
            )}
          </div>
        }
      />

      {canParam && configs.length > 1 && (
        <div className="text-xs text-slate-500">Plusieurs workflows existent dans la base : seuls les paramétrages du premier sont exposés ici.</div>
      )}

      {isLoading ? (
        <div className="p-10 text-center text-sm text-slate-400">Chargement…</div>
      ) : !selectedVersion ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Aucune version de workflow. {canParam && 'Créez la première version pour commencer.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne versions */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Versions du workflow</p>
            {configs[0]?.versions?.map((v) => (
              <button
                key={v.id_version}
                onClick={() => handleSelectVersion(v.id_version)}
                className={cn(
                  'w-full text-left px-3.5 py-3 rounded-xl border text-xs transition-colors',
                  selectedVersion?.id_version === v.id_version
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Version n°{v.numero}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold',
                      v.statut === 'publiee' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {v.statut === 'publiee' ? 'PUBLIÉE' : 'BROUILLON'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {v.statut === 'publiee' && v.date_publication
                    ? `Publiée le ${v.date_publication}`
                    : 'Non publiée — les nouvelles demandes utilisent la version active'}
                </div>
              </button>
            ))}
            {!configs[0]?.versions?.length && (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                Aucune version pour ce workflow.
              </div>
            )}
          </div>

          {/* Colonne étapes */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Étapes du circuit ({sortedEtapes.length}) — {selectedVersion.statut === 'publiee' ? 'lecture seule (version active)' : 'mode configuration'}
              </p>
              {isEditableVersion && (
                <span className="text-[11px] text-slate-500">Cliquez sur une étape pour modifier ses réglages</span>
              )}
            </div>

            {sortedEtapes.map((etape) => (
              <div
                key={etape.code}
                className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">
                      {etape.ordre}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{etape.libelle}</h3>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500">
                          {etape.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Settings2 className="w-3 h-3" />
                          {MODE_LABELS[etape.mode] ?? etape.mode}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{STRATEGIE_LABELS[etape.strategie] ?? etape.strategie}</span>
                        {etape.min_decisions > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>minimum {etape.min_decisions} décision(s)</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {isEditableVersion && (
                    <Button variant="ghost" size="sm" leftIcon={<Settings2 className="w-3.5 h-3.5" />} onClick={() => openEtapeEditor(etape)}>
                      Configurer
                    </Button>
                  )}
                </div>

                {(etape.approbateurs?.length ?? 0) > 0 ? (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {etape.approbateurs.map((a) => (
                      <span
                        key={a.id_approbateur}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700"
                      >
                        {a.type === 'email' ? (
                          <Mail className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Users className="w-3 h-3 text-teal-600" />
                        )}
                        {a.type === 'email' ? a.id_reference : (ROLE_REFERENCES.find((r) => r.code === a.id_reference)?.label ?? a.id_reference)}
                        <span className={cn('px-1 rounded text-[9px] font-bold uppercase', a.obligatoire ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500')}>
                          {a.obligatoire ? 'obligatoire' : 'facultatif'}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 pb-4 flex items-center gap-2 text-[11px] text-slate-500">
                    <FileStack className="w-3.5 h-3.5" /> Étape sans approbateur configuré (transitoire).
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Éditeur d'étape */}
      {editingEtape && isEditableVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditingEtape(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-5 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Configurer l'étape</h2>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{selectedVersion?.id_version ? `Version n°${selectedVersion.numero}` : ''}</span> • {editingEtape.libelle}
                </p>
              </div>
              <button onClick={() => setEditingEtape(null)} className="text-slate-400 hover:text-slate-700">
                <Trash2 className="w-0" />
                <span className="sr-only">Fermer</span>
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Mode d'exécution</label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as WorkflowModeEtape)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="parallele">Parallèle</option>
                  <option value="sequence">Séquence</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Stratégie de décision</label>
                <select
                  value={editStrategy}
                  onChange={(e) => setEditStrategy(e.target.value as WorkflowStrategie)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="tous">Tous (unanimité)</option>
                  <option value="au_moins_un">Au moins un</option>
                  <option value="majorite">Majorité</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Minimum (si majorité)</label>
                <input
                  type="number"
                  min={1}
                  value={editMin}
                  onChange={(e) => setEditMin(Number(e.target.value))}
                  disabled={editStrategy !== 'majorite'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-600">Approbateurs de l'étape</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Users className="w-3.5 h-3.5" />} onClick={() => addDraft('role')}>
                    Rôle
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<Mail className="w-3.5 h-3.5" />} onClick={() => addDraft('email')}>
                    Email
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {drafts.length === 0 && (
                  <p className="text-xs text-slate-400">Aucun approbateur — cette étape sera transitoire.</p>
                )}
                {drafts.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 uppercase">
                      {d.type === 'role' ? 'rôle' : 'email'}
                    </span>
                    {d.type === 'role' ? (
                      <select
                        value={d.id_reference}
                        onChange={(e) => patchDraft(d.key, { id_reference: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        {ROLE_REFERENCES.map((r) => (
                          <option key={r.code} value={r.code}>{r.label} ({r.code})</option>
                        ))}
                        <option value="__other__">… autre permission</option>
                      </select>
                    ) : (
                      <input
                        value={d.id_reference}
                        onChange={(e) => patchDraft(d.key, { id_reference: e.target.value })}
                        placeholder="email.approbateur@medicis.tn"
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    )}
                    <label className="flex items-center gap-1 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={d.obligatoire}
                        onChange={(e) => patchDraft(d.key, { obligatoire: e.target.checked })}
                      />
                      Oblig.
                    </label>
                    <button onClick={() => removeDraft(d.key)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setEditingEtape(null)}>Annuler</Button>
              <Button leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveEtape} isLoading={isSaving}>
                Enregistrer l'étape
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowAdminPage;