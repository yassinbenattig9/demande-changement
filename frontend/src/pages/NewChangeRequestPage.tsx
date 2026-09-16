import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building,
  Calendar,
  Plus,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { WizardStepper } from '../components/ui/WizardStepper';
import { FileDropzone } from '../components/ui/FileDropzone';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { AttachmentItem, SujetDemandeProvisoire, TabDiversItem, ProduitReferentiel } from '../types';
import { formatDateFr } from '../lib/utils';

const changeRequestSchema = z.object({
  sujet_changement: z
    .string()
    .min(5, 'Le sujet de la demande doit contenir au moins 5 caractères.')
    .max(200, 'Le sujet ne peut pas dépasser 200 caractères.'),
  type_changement: z.string().min(1, 'Veuillez sélectionner un type de changement.'),
  classement_changement: z.enum(['Urgent', 'Standard', 'Faible']),
  site: z.string().min(1, 'Veuillez sélectionner un site.'),
  date_souhaite_mep_changement: z.string().min(1, 'La date MEP souhaitée est obligatoire.'),
  etat_actuel: z
    .string()
    .min(10, 'Décrivez l\'état actuel de manière détaillée (au moins 10 caractères).'),
  description_changement: z
    .string()
    .min(20, 'Veuillez fournir une description détaillée d\'au moins 20 caractères.'),
  avantages_attendu: z.string().optional(),
  ressource_necessaire: z.string().optional(),
  produit_bailleur_licence_impactees: z.string().optional(),
  impact_produit_bailleur_licenece: z.string().optional(),
});

type FormValues = z.infer<typeof changeRequestSchema>;

const STEPS = [
  { id: 1, title: 'Sujet & Identification', description: 'Types, site, criticité' },
  { id: 2, title: 'Description & Dates', description: 'Justification GxP' },
  { id: 3, title: 'Services impactés', description: 'Évaluation préliminaire' },
  { id: 4, title: 'Pièces jointes & Fin', description: 'Documents & Soumission' },
];

const SERVICE_RESPONSABLE: Record<string, string> = {
  'Affaires Réglementaires': 'camille.laurent@medicis.com',
  'Validation & Métrologie': 'marc.vidal@medicis.com',
  'Assurance Qualité': 'eleonore.bertrand@medicis.com',
  'Production & Exploitation': 'philippe.garnier@medicis.com',
  'Logistique': 'sophie.mercier@medicis.com',
  'Systèmes d\'Information': 'sebastien.dubois@medicis.com',
  'Informatique': 'sebastien.dubois@medicis.com',
  'Contrôle Qualité (CQ)': 'eleonore.bertrand@medicis.com',
  'Maintenance & Utilités': 'philippe.garnier@medicis.com',
};

const toDDMMYYYY = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const NewChangeRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [typesList, setTypesList] = useState<TabDiversItem[]>([]);
  const [sitesList, setSitesList] = useState<TabDiversItem[]>([]);
  const [servicesList, setServicesList] = useState<TabDiversItem[]>([]);
  const [productsList, setProductsList] = useState<ProduitReferentiel[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [sujets, setSujets] = useState<SujetDemandeProvisoire[]>([
    { Sujet: '', Designation: '', Code_ou_indexation: '', id_prov: 1 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: {
      sujet_changement: '',
      type_changement: '',
      classement_changement: 'Standard',
      site: '',
      date_souhaite_mep_changement: '',
      etat_actuel: '',
      description_changement: '',
      avantages_attendu: '',
      ressource_necessaire: '',
      produit_bailleur_licence_impactees: '',
      impact_produit_bailleur_licenece: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    Promise.all([
      apiClient.getTypesChangement(),
      apiClient.getSites(),
      apiClient.getTabDivers('service'),
      apiClient.getProducts(),
    ])
      .then(([types, sites, services, produits]) => {
        setTypesList(types);
        setSitesList(sites);
        setServicesList(services);
        setProductsList(produits);
      })
      .catch(() => {
        error('Erreur', 'Impossible de charger les listes de référence.');
      });
  }, []);

  const handleProductPick = (code: string) => {
    const product = productsList.find((p) => p.code === code);
    if (!product) return;
    setSujets((prev) =>
      prev.map((s, i) =>
        i === prev.length - 1 ? { ...s, Designation: product.designation, Code_ou_indexation: product.code } : s
      )
    );
  };

  const updateSujet = (idx: number, patch: Partial<SujetDemandeProvisoire>) => {
    setSujets((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSujetRow = () => {
    const maxId = Math.max(...sujets.map((s) => s.id_prov ?? 0), 0);
    setSujets([...sujets, { Sujet: '', Designation: '', Code_ou_indexation: '', id_prov: maxId + 1 }]);
  };

  const removeSujetRow = (idx: number) => {
    if (sujets.length === 1) return;
    setSujets(sujets.filter((_, i) => i !== idx));
  };

  const sujetsValid = sujets.every((s) => (s.Sujet || '').trim().length >= 3);

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['sujet_changement', 'type_changement', 'site', 'classement_changement'];
      if (!sujetsValid) {
        error('Sujets incomplets', 'Chaque ligne de sujet doit comporter un intitulé d\'au moins 3 caractères.');
        return;
      }
    } else if (currentStep === 2) {
      fieldsToValidate = ['date_souhaite_mep_changement', 'etat_actuel', 'description_changement'];
    } else if (currentStep === 3) {
      if (selectedServices.length === 0) {
        error('Services manquants', 'Sélectionnez au moins un service impacté.');
        return;
      }
      setCurrentStep(4);
      return;
    }

    const stepValid = await trigger(fieldsToValidate);
    if (stepValid) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
    } else {
      error('Champs manquants', 'Veuillez corriger les erreurs en rouge avant de poursuivre.');
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const buildDemandePayload = (values: FormValues, soumis: boolean) => {
    const designation = sujets
      .map((s) => s.Designation.trim())
      .filter(Boolean)
      .join('-') || values.sujet_changement;
    const codes = sujets
      .map((s) => s.Code_ou_indexation.trim())
      .filter(Boolean)
      .join('-') || 'N/A';

    return {
      demandeur: currentUser.email,
      etat_demande: 'demande_éditée' as string,
      sujet_changement: values.sujet_changement.trim(),
      designation,
      codes,
      date_edition: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      date_souhaite_mep_changement: toDDMMYYYY(values.date_souhaite_mep_changement),
      service_demandeur: currentUser.service,
      type_changement: values.type_changement,
      site: values.site,
      etat_actuel: values.etat_actuel,
      description_changement: values.description_changement,
      avantages_attendu: values.avantages_attendu || 'Non renseigné',
      ressource_necessaire: values.ressource_necessaire || 'Non renseigné',
      classement_changement: values.classement_changement,
      produit_bailleur_licence_impactees: values.produit_bailleur_licence_impactees || 'Aucun',
      impact_produit_bailleur_licenece: values.impact_produit_bailleur_licenece || 'Non renseigné',
      cloturer: false,
      nbr_reponse_services: 0,
    };
  };

  const persistSubDemandes = async (numero_demande: number) => {
    const nonEmpty = sujets.filter((s) => s.Sujet.trim());
    for (const s of nonEmpty) {
      await apiClient.addSujet({
        numero_demande,
        Sujet: s.Sujet.trim(),
        Designation: s.Designation.trim(),
        Code_ou_indexation: s.Code_ou_indexation.trim(),
      });
    }
    for (const service of selectedServices) {
      await apiClient.addServiceImpact(numero_demande, {
        service,
        email_cancernee: SERVICE_RESPONSABLE[service] || currentUser.email,
        fonction: `Responsable ${service}`,
      });
    }
  };

  const handleSaveDraft = async () => {
    const values = watch();
    setIsSubmitting(true);
    try {
      const draft = await apiClient.createDemande(
        buildDemandePayload(
          { ...values, sujet_changement: values.sujet_changement || 'Brouillon sans sujet' },
          false
        )
      );
      await persistSubDemandes(draft.numero_demande);
      success('Brouillon sauvegardé', `Demande ${draft.numero_chronologique} enregistrée avec succès.`);
      navigate(`/demandes/${draft.numero_demande}`);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de sauvegarder le brouillon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const newDemande = await apiClient.createDemande(buildDemandePayload(data, true));
      await persistSubDemandes(newDemande.numero_demande);

      success(
        'Demande soumise avec succès',
        `La demande ${newDemande.numero_chronologique} a été transmise à votre Responsable de Service pour acceptation hiérarchique.`
      );
      navigate(`/demandes/${newDemande.numero_demande}`);
    } catch (e) {
      console.error(e);
      error('Erreur de soumission', 'Une anomalie est survenue lors de l\'enregistrement GxP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Nouvelle demande de changement (Change Control)"
        subtitle="Formulaire officiel d'initialisation de modification GxP selon la procédure générale SOP-QA-001."
        breadcrumbs={[
          { label: 'Tableau de bord', href: '/' },
          { label: 'Demandes', href: '/demandes' },
          { label: 'Nouvelle demande' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Enregistrer comme brouillon
          </Button>
        }
      />

      <WizardStepper steps={STEPS} currentStep={currentStep} onStepClick={(id) => setCurrentStep(id)} />

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Étape 1 : Sujet & Identification</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Intitulé de la demande, type de changement, site et criticité.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Sujet du changement (titre) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  {...register('sujet_changement')}
                  placeholder="Ex : Remplacement de la membrane filtrante 0.22µm sur Skid A4"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
                {errors.sujet_changement && (
                  <p className="text-xs text-rose-600">{errors.sujet_changement.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Type de changement</label>
                  <select
                    {...register('type_changement')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  >
                    <option value="">Sélectionner...</option>
                    {typesList.map((t, i) => (
                      <option key={i} value={t.designation}>
                        {t.designation}
                      </option>
                    ))}
                  </select>
                  {errors.type_changement && (
                    <p className="text-xs text-rose-600">{errors.type_changement.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Criticité / Urgence</label>
                  <select
                    {...register('classement_changement')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  >
                    <option value="Standard">Standard (délai normal)</option>
                    <option value="Urgent">Urgent (risque approvisionnement)</option>
                    <option value="Faible">Faible (amélioration continue)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Site concerné</label>
                  <select
                    {...register('site')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  >
                    <option value="">Sélectionner...</option>
                    {sitesList.map((s, i) => (
                      <option key={i} value={s.code}>
                        {s.code} — {s.designation}
                      </option>
                    ))}
                  </select>
                  {errors.site && <p className="text-xs text-rose-600">{errors.site.message}</p>}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-teal-700" />
                      Sujets détaillés (DCMEDICIS.dbo.Sujet_Demande)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Une demande peut regrouper plusieurs produits / localisations.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSujetRow} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Ajouter un sujet
                  </Button>
                </div>

                {productsList.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Reprendre du catalogue :</span>
                    <select
                      onChange={(e) => handleProductPick(e.target.value)}
                      defaultValue=""
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">— Sélectionner un produit —</option>
                      {productsList
                        .filter(
                          (p, i, arr) =>
                            arr.findIndex(
                              (x) => String(x.code || '').trim().toLowerCase() === String(p.code || '').trim().toLowerCase()
                            ) === i
                        )
                        .map((p, i) => (
                          <option key={`${String(p.code || '').trim().toLowerCase()}-${i}`} value={p.code}>
                            {p.code} • {p.designation}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  {sujets.map((s, idx) => (
                    <div key={s.id_prov} className="grid grid-cols-12 gap-2">
                      <input
                        value={s.Sujet}
                        onChange={(e) => updateSujet(idx, { Sujet: e.target.value })}
                        placeholder={`Sujet ${idx + 1} (ex : Remplacement membrane Skid A4)`}
                        className="col-span-12 sm:col-span-5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <input
                        value={s.Designation}
                        onChange={(e) => updateSujet(idx, { Designation: e.target.value })}
                        placeholder="Designation"
                        className="col-span-6 sm:col-span-4 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <input
                        value={s.Code_ou_indexation}
                        onChange={(e) => updateSujet(idx, { Code_ou_indexation: e.target.value })}
                        placeholder="Code / indexation"
                        className="col-span-5 sm:col-span-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeSujetRow(idx)}
                        disabled={sujets.length === 1}
                        className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        title="Retirer ce sujet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Étape 2 : Description détaillée & Dates
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explicitez l'état actuel, la modification proposée et les justifications.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Date MEP souhaitée <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('date_souhaite_mep_changement')}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
                  />
                  {errors.date_souhaite_mep_changement && (
                    <p className="text-xs text-rose-600">{errors.date_souhaite_mep_changement.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-teal-600" />
                    Impacts produits / bailleurs / licences
                  </label>
                  <input
                    type="text"
                    {...register('produit_bailleur_licence_impactees')}
                    placeholder="Ex : Produit X - Titulaire, bailleur Y"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  État actuel (avant modification) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  {...register('etat_actuel')}
                  placeholder="Décrivez l'état actuel du procédé, équipement ou système..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 leading-relaxed"
                />
                {errors.etat_actuel && <p className="text-xs text-rose-600">{errors.etat_actuel.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Description précise du changement <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  {...register('description_changement')}
                  placeholder="Décrivez la modification proposée et les composants techniques affectés..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 leading-relaxed"
                />
                {errors.description_changement && (
                  <p className="text-xs text-rose-600">{errors.description_changement.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Avantages attendus</label>
                  <textarea
                    rows={3}
                    {...register('avantages_attendu')}
                    placeholder="Ex : Fiabilité accrue, conformité Pharmacopée..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 leading-relaxed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ressources nécessaires</label>
                  <textarea
                    rows={3}
                    {...register('ressource_necessaire')}
                    placeholder="Ex : Validation, Métrologie, arrêt de ligne 48h..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Impact sur produits / bailleurs / licences</label>
                <textarea
                  rows={2}
                  {...register('impact_produit_bailleur_licenece')}
                  placeholder="Précisez l'impact sur les autorisations d'exploitation, titulaires, bailleurs..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 leading-relaxed"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Étape 3 : Sollicitation des services impactés
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez les départements qui devront formaliser une évaluation d'impact
                  technique, réglementaire ou documentaire.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(servicesList.length > 0 ? servicesList.map((sv) => sv.designation) : []).map((name) => {
                  const isChecked = selectedServices.includes(name);
                  return (
                    <div
                      key={name}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedServices(selectedServices.filter((s) => s !== name));
                        } else {
                          setSelectedServices([...selectedServices, name]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {SERVICE_RESPONSABLE[name]
                            ? `Responsable habilité : ${SERVICE_RESPONSABLE[name]}`
                            : 'Évaluation d\'impact à fournir'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  Chaque responsable recevra automatiquement une notification pour évaluer les
                  impacts dans la table DCMEDICIS.dbo.Service_impactees.
                </span>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Étape 4 : Pièces jointes & Récapitulatif avant soumission
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Joignez les justificatifs techniques (certificats, protocoles, fiches de sécurité).
                </p>
              </div>

              <FileDropzone
                attachments={attachments}
                onAddAttachment={(att) => setAttachments([...attachments, att])}
                onRemoveAttachment={(id) => setAttachments(attachments.filter((a) => a.id !== id))}
              />

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Synthèse de la demande pré-soumission
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Sujet :</span>{' '}
                    <span className="text-slate-900 font-semibold">{watch('sujet_changement')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Type / Criticité :</span>{' '}
                    <span className="text-slate-900 font-semibold">
                      {watch('type_changement')} • {watch('classement_changement')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Site :</span>{' '}
                    <span className="text-slate-900 font-semibold">{watch('site')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">MEP souhaitée :</span>{' '}
                    <span className="text-teal-700 font-semibold font-mono">
                      {formatDateFr(watch('date_souhaite_mep_changement'))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sujets détaillés :</span>{' '}
                    <span className="text-slate-900 font-semibold">{sujets.filter((s) => s.Sujet.trim()).length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Services impactés :</span>{' '}
                    <span className="text-slate-900 font-semibold">{selectedServices.length}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  Demandeur :{' '}
                  <span className="text-slate-800 font-medium">
                    {currentUser.prenom} {currentUser.nom}
                  </span>{' '}
                  ({currentUser.service} — {currentUser.email})
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Précédent
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => navigate('/demandes')}>
                Annuler
              </Button>
            )}

            <div className="flex items-center gap-3">
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNextStep}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continuer
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Soumettre pour acceptation hiérarchique
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChangeRequestPage;