import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldAlert,
  Paperclip,
  History,
  Download,
  Check,
  X,
  UserCheck,
  Building,
  ListChecks,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { WorkflowPipeline, AuditTimeline } from '../components/ui/Timeline';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import {
  Demande,
  Approbation,
  ServiceImpacte,
  HistoriqueAudit,
  SujetDemande,
  AttachmentItem,
  TypeApprobation,
  normalizeWorkflowState,
  WORKFLOW_LABELS,
  TYPE_APPROBATION_LABELS,
  DECISION_LABELS,
} from '../types';
import { formatDateFr } from '../lib/utils';


type ActiveTab = 'general' | 'sujets' | 'impacts' | 'approbations' | 'pieces_jointes' | 'audit';
type ModalType = 'validé' | 'refusé' | 'complément';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, permissions } = useAuth();
  const { success, error } = useToast();

  const [demande, setDemande] = useState<Demande | null>(null);
  const [sujets, setSujets] = useState<SujetDemande[]>([]);
  const [approbations, setApprobations] = useState<Approbation[]>([]);
  const [impacts, setImpacts] = useState<ServiceImpacte[]>([]);
  const [auditTrail, setAuditTrail] = useState<HistoriqueAudit[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [isLoading, setIsLoading] = useState(true);

  const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: ModalType; title: string }>({
    isOpen: false,
    type: 'validé',
    title: '',
  });
  const [actionComment, setActionComment] = useState('');
  const [signaturePin, setSignaturePin] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const demandeId = Number(id) || 1001;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const d = await apiClient.getDemandeById(demandeId);
      if (!d) {
        error('Introuvable', `Aucune demande #${demandeId} n'existe.`);
        setIsLoading(false);
        return;
      }
      const [s, a, imp, aud, pj] = await Promise.all([
        apiClient.getSujetsByDemande(demandeId),
        apiClient.getApprobationsByDemande(demandeId),
        apiClient.getServicesImpactesByDemande(demandeId),
        apiClient.getAuditTrail(), // journal global ; filtré ci-dessous
        apiClient.getPiecesJointes(),
      ]);
      setDemande(d);
      setSujets(s);
      setApprobations(a);
      setImpacts(imp);
      setAuditTrail(aud.filter((h) => h.numero_chronologique === d.numero_chronologique));
      setAttachments(
        pj.map((p, i) => ({
          id: `pj-${i}`,
          nom_fichier: p.nom_fichier,
          taille_octets: p.taille_octets,
          type_mime: 'application/octet-stream',
          date_upload: '',
          televerse_par: '',
          categorie: 'Autre' as const,
        }))
      );
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la demande.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [demandeId]);

  if (isLoading || !demande) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Chargement du dossier Change Control...</p>
      </div>
    );
  }

  const currentWorkflowState = normalizeWorkflowState(demande.etat_demande);

  const canApproveCurrentStage =
    (currentWorkflowState === 'acceptation_responsable_service' && permissions.peut_valider_hierarchie) ||
    (currentWorkflowState === 'approbation_directeur_qualité' && permissions.peut_valider_qualite) ||
    (currentWorkflowState === 'approbation_PRT' && permissions.peut_valider_prt) ||
    (currentWorkflowState === 'Demande de changement en cours' && permissions.peut_cloturer_changement) ||
    permissions.peut_administrer;

  const approbationTypeForState = (): TypeApprobation | null => {
    if (currentWorkflowState === 'acceptation_responsable_service') return 'acceptation_responsable_service';
    if (currentWorkflowState === 'acceptation_coordinateur_changement') return 'acceptation_coordinateur_changement';
    if (currentWorkflowState === 'acceptation_chargé_changement') return 'acceptation_chargé_changement';
    if (currentWorkflowState === 'acceptation_responsable_changement') return 'acceptation_responsable_changement';
    if (currentWorkflowState === 'approbation_directeur_qualité') return 'approbation_directeur_qualité';
    if (currentWorkflowState === 'approbation_PRT') return 'approbation_PRT';
    return null;
  };

  const handleOpenAction = (type: ModalType) => {
    const titles = {
      'validé': 'Approbation formelle GxP',
      'refusé': 'Refus motivé de la demande',
      'complément': "Demande d'informations complémentaires",
    };
    setActionComment('');
    setSignaturePin('');
    setActionModal({ isOpen: true, type, title: titles[type] });
  };

  const handleConfirmAction = async () => {
    if (!actionComment.trim()) {
      error('Commentaire obligatoire', 'Le référentiel GxP impose un motif écrit détaillé.');
      return;
    }
    if (actionModal.type === 'validé' && !signaturePin.trim()) {
      error('Signature électronique', 'Veuillez saisir votre code PIN de validation 21 CFR Part 11.');
      return;
    }
    const approbationType = approbationTypeForState();
    if (!approbationType) {
      error('Action impossible', "Aucune étape d'approbation n'est attendue pour cet état.");
      return;
    }

    setIsProcessingAction(true);
    try {
      const decision =
        actionModal.type === 'validé' ? ('valide' as const) : ('refusée' as const);

      await apiClient.submitApproval({
        numero_demande: demande.numero_demande,
        type_approbation: approbationType,
        email_approbant: currentUser.email,
        decision:
          actionModal.type === 'complément' ? ('NON APPLICABLE' as const) : decision,
        commentaire: actionComment,
        markIncomplete: actionModal.type === 'complément',
      });

      success('Décision enregistrée', "L'action a été consignée dans l'audit trail DCMEDICIS.");
      setActionModal({ ...actionModal, isOpen: false });
      await loadData();
    } catch (e) {
      error('Erreur', "Impossible d'enregistrer la décision.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const decisionStyle = (decision: string) => {
    if (decision === 'valide') return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    if (decision === 'refusée') return 'bg-rose-50 text-rose-800 border border-rose-200';
    if (decision === 'NON APPLICABLE') return 'bg-slate-100 text-slate-700 border border-slate-200';
    return 'bg-amber-50 text-amber-800 border border-amber-200';
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'Général & Justification', icon: <FileText className="w-4 h-4" /> },
    { id: 'sujets', label: `Sujets (${sujets.length})`, icon: <ListChecks className="w-4 h-4" /> },
    { id: 'impacts', label: `Services Impactés (${impacts.length})`, icon: <Building className="w-4 h-4" /> },
    { id: 'approbations', label: `Approbations (${approbations.length})`, icon: <UserCheck className="w-4 h-4" /> },
    { id: 'pieces_jointes', label: `Pièces Jointes (${attachments.length})`, icon: <Paperclip className="w-4 h-4" /> },
    { id: 'audit', label: `Piste d'Audit (${auditTrail.length})`, icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Demande ${demande.numero_chronologique}`}
        subtitle={demande.sujet_changement}
        breadcrumbs={[
          { label: 'Tableau de bord', href: '/' },
          { label: 'Demandes', href: '/demandes' },
          { label: demande.numero_chronologique },
        ]}
        badge={<StatusBadge status={demande.etat_demande} size="md" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => success('Export généré', 'Dossier complet GxP téléchargé au format PDF.')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export GxP (PDF)
            </Button>
            {canApproveCurrentStage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAction('complément')}
                  leftIcon={<Users className="w-4 h-4" />}
                >
                  Complément
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleOpenAction('refusé')}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Refuser
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleOpenAction('validé')}
                  leftIcon={<Check className="w-4 h-4 stroke-[3]" />}
                >
                  Approuver l'étape
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pipeline de progression du changement
            </h2>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">
              Statut actuel : {WORKFLOW_LABELS[currentWorkflowState] || currentWorkflowState}
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Étape séquentielle validée par DCMEDICIS
          </span>
        </div>
        <WorkflowPipeline currentStatus={demande.etat_demande} />
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-teal-800 border-t-2 border-teal-600 border-x border-slate-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                État actuel
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {demande.etat_actuel}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Description de la modification
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {demande.description_changement}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Avantages attendus
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {demande.avantages_attendu}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ressources nécessaires
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {demande.ressource_necessaire}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Impacts produits / bailleurs / licences
              </h3>
              <p className="text-xs text-slate-700 font-medium mb-1">{demande.produit_bailleur_licence_impactees}</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {demande.impact_produit_bailleur_licenece}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Caractéristiques de la demande
              </h3>
              <div className="space-y-3 text-xs divide-y divide-slate-100">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Designation :</span>
                  <span className="text-slate-900 font-semibold text-right max-w-[200px]">{demande.designation}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Codes :</span>
                  <span className="text-teal-700 font-mono font-semibold">{demande.codes}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Site :</span>
                  <span className="text-slate-800 font-medium">{demande.site}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Type de changement :</span>
                  <span className="text-slate-800 font-medium">{demande.type_changement}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Criticité :</span>
                  <span className={`font-semibold ${demande.classement_changement === 'Urgent' ? 'text-rose-600' : 'text-slate-700'}`}>
                    {demande.classement_changement}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Date d'édition :</span>
                  <span className="text-slate-700 font-mono">{formatDateFr(demande.date_edition)}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">MEP souhaitée :</span>
                  <span className="text-amber-700 font-mono font-semibold">
                    {formatDateFr(demande.date_souhaite_mep_changement)}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Demandeur :</span>
                  <span className="text-slate-900 font-medium text-right">
                    {demande.nom_demandeur}
                    <br />
                    <span className="text-[11px] text-slate-500">{demande.service_demandeur}</span>
                  </span>
                </div>
                {demande.cloturer && (
                  <>
                    <div className="pt-2 flex justify-between">
                      <span className="text-slate-500">Clôturée le :</span>
                      <span className="text-emerald-700 font-mono font-semibold">{formatDateFr(demande.date_clôture)}</span>
                    </div>
                    {demande.commentaire_cloture_charge_changement && (
                      <div className="pt-2">
                        <span className="text-slate-500 block mb-1">Commentaire de clôture :</span>
                        <p className="text-slate-700 italic bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-[11px]">
                          {demande.commentaire_cloture_charge_changement}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {demande.Action_Qualipro && (
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Action Qualipro :</span>
                    <span className="text-indigo-700 font-mono font-semibold">{demande.Action_Qualipro}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sujets' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Une demande peut porter sur plusieurs sujets (DCMEDICIS.dbo.Sujet_Demande).
          </p>
          {sujets.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400 text-center">
              Aucun sujet enregistré pour cette demande.
            </div>
          ) : (
            sujets.map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs font-mono">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.Sujet}</p>
                    <p className="text-[11px] text-slate-500">
                      {s.Designation} {s.Code_ou_indexation && `• ${s.Code_ou_indexation}`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'impacts' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Chaque département évalue l'impact sur ses procédures, équipements ou autorisations (DCMEDICIS.dbo.Service_impactees).
          </p>
          {impacts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400 text-center">
              Aucune évaluation d'impact transmise pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {impacts.map((imp, i) => (
                <div key={imp.id_impact ?? i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs font-mono uppercase">
                        {imp.service.slice(0, 2)}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{imp.service}</h4>
                        <p className="text-[11px] text-slate-500">
                          {imp.fonction} • {imp.Intervenant || imp.email_cancernee}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        imp.reponse === 'oui'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {imp.reponse === 'oui' ? 'Impact évalué' : 'En attente de réponse'}
                    </span>
                  </div>
                  {imp.commentaire ? (
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {imp.commentaire}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucun commentaire transmis.</p>
                  )}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    Répondue le : {formatDateFr(imp.date_reponse, true)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approbations' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Enregistrement formel des décisions et signatures (DCMEDICIS.dbo.Approbation).
          </p>
          {approbations.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400 text-center">
              Aucune approbation enregistrée pour cette demande.
            </div>
          ) : (
            <div className="space-y-3">
              {approbations.map((app, i) => (
                <div key={app.id_approbation ?? i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                        {TYPE_APPROBATION_LABELS[app.type_approbation] ?? app.type_approbation}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {app.email_approbant || 'Approbateur non désigné'}
                      </h4>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${decisionStyle(app.decision)}`}>
                      {DECISION_LABELS[app.decision as keyof typeof DECISION_LABELS] ?? app.decision}
                    </span>
                  </div>
                  {app.commentaire ? (
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                      « {app.commentaire} »
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucun commentaire renseigné.</p>
                  )}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    Date décision : {formatDateFr(app.Date_approbation, true)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pieces_jointes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Fichiers réglementaires associés à cette demande de changement.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => success('Téléversement simulé', 'Sélectionnez un document GxP à ajouter.')}
              leftIcon={<Paperclip className="w-3.5 h-3.5" />}
            >
              Ajouter un document
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((att) => (
              <div key={att.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{att.nom_fichier}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {att.categorie} • {formatDateFr(att.date_upload)} • Par {att.televerse_par}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => success('Téléchargement', `Document ${att.nom_fichier} téléchargé.`)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Ouvrir
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Piste d'Audit Immuable (21 CFR Part 11 / GAMP 5)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historique des transactions générées dans DCMEDICIS.dbo.historique pour {demande.numero_chronologique}.
            </p>
          </div>
          <AuditTimeline events={auditTrail} />
        </div>
      )}

      <ConfirmDialog
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={actionModal.title}
        variant={actionModal.type === 'validé' ? 'success' : actionModal.type === 'refusé' ? 'danger' : 'warning'}
        confirmLabel={
          actionModal.type === 'validé'
            ? 'Signer et Valider'
            : actionModal.type === 'refusé'
            ? 'Confirmer le Refus'
            : 'Enregistrer'
        }
        isLoading={isProcessingAction}
        description={
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Vous agissez en qualité de{' '}
              <strong className="text-teal-800 font-semibold">{currentUser.Role_user}</strong> ({currentUser.service}).
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Commentaire qualité obligatoire (Français) <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Renseignez le fondement technique ou la justification de votre décision..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            {actionModal.type === 'validé' && (
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-teal-900 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-teal-700" />
                  <span>Signature électronique (21 CFR Part 11)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  En saisissant votre code PIN, vous attestez que votre signature électronique a la
                  même valeur juridique qu'une signature manuscrite.
                </p>
                <input
                  type="password"
                  value={signaturePin}
                  onChange={(e) => setSignaturePin(e.target.value)}
                  placeholder="Saisissez votre code PIN GxP (ex: 1234)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default RequestDetailPage;