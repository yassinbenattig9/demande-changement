import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  Check,
  X,
  MessageSquarePlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { PendingApproval, TYPE_APPROBATION_LABELS } from '../types';
import { formatDateFr } from '../lib/utils';

type ModalKind = 'approve' | 'reject' | 'complement';

const typeLabel = (type: string): string =>
  (TYPE_APPROBATION_LABELS as Record<string, string>)[type] ?? type;

export const ApprovalQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'overdue'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [active, setActive] = useState<PendingApproval | null>(null);
  const [modalKind, setModalKind] = useState<ModalKind>('approve');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [signaturePin, setSignaturePin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await apiClient.getPendingApprovals();
      // Le moteur renvoie une entrée par approbateur non décidé : on garde
      // les décisions qui nous concernent.
      const mine = (rows ?? []).filter(
        (p) => p.approbation.email_approbant === currentUser.email
      );
      setPending(mine);
    } catch (e) {
      console.error(e);
      error('Erreur', "Impossible de charger la file d'approbation.");
      setPending([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.email, error]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filtered = useMemo(() => {
    if (filterType === 'urgent')
      return pending.filter((p) => p.demande.classement_changement === 'Urgent');
    if (filterType === 'overdue')
      return pending.filter((p) => {
        const d = p.demande.date_souhaite_mep_changement;
        if (!d) return false;
        return new Date(d).getTime() < new Date().getTime();
      });
    return pending;
  }, [pending, filterType]);

  const groupedCount = useMemo(() => {
    const set = new Set<number>();
    for (const p of filtered) set.add(p.demande.numero_demande);
    return set.size;
  }, [filtered]);

  const handleOpenDecision = (entry: PendingApproval, kind: ModalKind) => {
    setActive(entry);
    setModalKind(kind);
    setComment('');
    setSignaturePin('');
    setIsModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!active) return;

    if (!comment.trim()) {
      error('Commentaire obligatoire', "Tout acte d'approbation ou de rejet GxP exige une justification rédigée.");
      return;
    }
    if (modalKind === 'approve' && !signaturePin.trim()) {
      error('Signature électronique', 'Veuillez saisir votre code PIN GxP pour horodater la décision.');
      return;
    }

    setIsSubmitting(true);
    try {
      const decision =
        modalKind === 'approve' ? ('valide' as const) : modalKind === 'reject' ? ('refusée' as const) : ('NON APPLICABLE' as const);

      await apiClient.submitApproval({
        numero_demande: active.demande.numero_demande,
        type_approbation: active.approbation.type_approbation as never,
        email_approbant: active.approbation.email_approbant || currentUser.email,
        decision,
        commentaire: comment,
        markIncomplete: modalKind === 'complement',
      });

      success(
        'Décision consignée',
        `La demande ${active.demande.numero_chronologique} a été mise à jour avec succès.`
      );
      setIsModalOpen(false);
      await loadQueue();
    } catch (e) {
      console.error(e);
      error('Erreur', "Impossible d'enregistrer la décision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PendingApproval>[] = [
    {
      header: 'N° Chrono',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/demandes/${row.demande.numero_demande}`)}
          className="font-mono text-xs font-bold text-teal-700 hover:underline hover:text-teal-800"
        >
          {row.demande.numero_chronologique}
        </button>
      ),
      sortable: true,
      className: 'w-24',
    },
    {
      header: 'Sujet & Designation',
      accessor: (row) => (
        <div className="min-w-[220px]">
          <p
            onClick={() => navigate(`/demandes/${row.demande.numero_demande}`)}
            className="text-xs font-semibold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-1"
          >
            {row.demande.sujet_changement}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {row.demande.designation} • <span className="font-mono">{row.demande.codes}</span>
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'À statuer',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
          <Users className="w-3 h-3" />
          {typeLabel(row.approbation.type_approbation)}
        </span>
      ),
      className: 'w-44',
    },
    {
      header: 'Étape du circuit',
      accessor: (row) => (
        row.etape ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
            <ClipboardCheck className="w-3 h-3 text-teal-600" />
            {row.etape}
          </span>
        ) : (
          <StatusBadge status={row.demande.etat_demande} size="sm" />
        )
      ),
    },
    {
      header: 'Criticité',
      accessor: (row) => {
        const isUrgent = row.demande.classement_changement === 'Urgent';
        return (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isUrgent ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {row.demande.classement_changement}
          </span>
        );
      },
      sortable: true,
    },
    {
      header: 'Demandeur',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-slate-900 font-medium">{row.demande.nom_demandeur}</p>
          <p className="text-[11px] text-slate-500">{row.demande.service_demandeur}</p>
        </div>
      ),
    },
    {
      header: 'MEP souhaitée',
      accessor: (row) => {
        const isOverdue =
          row.demande.date_souhaite_mep_changement &&
          new Date(row.demande.date_souhaite_mep_changement).getTime() < new Date().getTime();
        return (
          <span className={`font-mono text-xs ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
            {formatDateFr(row.demande.date_souhaite_mep_changement)}
          </span>
        );
      },
      sortable: true,
    },
    {
      header: 'Décision GxP',
      accessor: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDecision(row, 'complement')}
            title="Demander un complément"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleOpenDecision(row, 'reject')}
            title="Refuser"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => handleOpenDecision(row, 'approve')}
            title="Approuver et signer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="File d'approbation Change Control"
        subtitle="Décisions en attente pour votre signature selon le circuit configuré (validations parallèles 1→2→3→4, PRT, qualité…)."
        badge={
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {filtered.length} décision(s) en attente • {groupedCount} demande(s)
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
          }`}
        >
          Toutes mes décisions ({pending.length})
        </button>
        <button
          onClick={() => setFilterType('urgent')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
            filterType === 'urgent'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Criticité Urgente
        </button>
        <button
          onClick={() => setFilterType('overdue')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
            filterType === 'overdue'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" /> En dépassement d'échéance
        </button>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(item) => `${item.demande.numero_demande}-${item.approbation.type_approbation}-${item.approbation.email_approbant}`}
        searchableKey={(r) => `${r.demande.sujet_changement} ${r.demande.designation} ${r.demande.nom_demandeur} ${r.demande.numero_chronologique}`}
        searchPlaceholder="Rechercher par sujet, designation, demandeur..."
        isLoading={isLoading}
        emptyTitle="Aucune décision en attente pour vous."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDecision}
        title={
          modalKind === 'approve'
            ? `Approuver la demande ${active?.demande.numero_chronologique}`
            : modalKind === 'reject'
            ? `Refuser la demande ${active?.demande.numero_chronologique}`
            : `Complément pour la demande ${active?.demande.numero_chronologique}`
        }
        variant={modalKind === 'approve' ? 'success' : modalKind === 'reject' ? 'danger' : 'warning'}
        confirmLabel={
          modalKind === 'approve'
            ? 'Signer et Valider'
            : modalKind === 'reject'
            ? 'Confirmer le Rejet'
            : 'Enregistrer'
        }
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="text-slate-500 block">Demande :</span>
              <strong className="text-slate-900">{active?.demande.sujet_changement}</strong>
              <div className="mt-1 text-[11px] text-slate-500">
                Demandeur : {active?.demande.nom_demandeur} ({active?.demande.service_demandeur})
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
                <FileText className="w-3 h-3" />
                Étape : {active ? typeLabel(active.approbation.type_approbation) : ''}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Commentaire qualité obligatoire (Français) <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Renseignez le fondement technique ou la justification de votre décision..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            {modalKind === 'approve' && (
              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-teal-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Signature électronique (21 CFR Part 11)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Saisissez votre code PIN personnel pour sceller la signature électronique.
                </p>
                <input
                  type="password"
                  value={signaturePin}
                  onChange={(e) => setSignaturePin(e.target.value)}
                  placeholder="Code PIN de signature (ex: 1234)"
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

export default ApprovalQueuePage;