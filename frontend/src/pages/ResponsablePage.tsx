import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCircle, CheckCircle2, Send } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { Demande, ServiceImpacte } from '../types';

interface ImpactRow {
  impact: ServiceImpacte;
  demande: Demande;
}

export const ResponsablePage: React.FC = () => {
  const { domaine } = useParams<{ domaine: string }>();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [rows, setRows] = useState<ImpactRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeRow, setActiveRow] = useState<ImpactRow | null>(null);
  const [comment, setComment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadImpacts = async () => {
    setIsLoading(true);
    try {
      const demandes = await apiClient.getDemandes();
      const collected: ImpactRow[] = [];
      await Promise.all(
        demandes.map(async (d) => {
          const impacts = await apiClient.getServicesImpactesByDemande(d.numero_demande);
          impacts
            .filter(
              (i) =>
                i.email_cancernee === currentUser.email &&
                (i.service.toLowerCase().includes((domaine ?? '').toLowerCase()) || !domaine || domaine === '*-')
            )
            .forEach((i) => collected.push({ impact: i, demande: d }));
        })
      );
      setRows(collected);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger vos évaluations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImpacts();
  }, [domaine]);

  const pending = rows.filter((r) => r.impact.reponse !== 'oui');

  const handleConfirm = async () => {
    if (!activeRow) return;
    if (!comment.trim()) {
      error('Commentaire requis', "L'évaluation d'impact doit être motivée par écrit.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.updateServiceImpact(activeRow.impact.numero_demande, {
        service: activeRow.impact.service,
        email_cancernee: activeRow.impact.email_cancernee,
        reponse: 'oui',
        date_reponse: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        commentaire: comment.trim(),
        Intervenant: `${currentUser.prenom} ${currentUser.nom}`,
      });
      success('Réponse enregistrée', 'Votre avis a été transmis pour les actions de suivi.');
      setIsModalOpen(false);
      setComment('');
      await loadImpacts();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer votre avis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Responsable — ${domaine || 'Tous les domaines'}`}
        subtitle="Vos évaluations d'impact en tant que responsable de service (avis et actions services)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Responsable', href: '/responsable' }, { label: domaine || '' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {pending.length} évaluation(s) à rendre
          </span>
        }
      />

      <div className="space-y-3">
        {isLoading && <p className="text-xs text-slate-400 text-center py-10">Chargement...</p>}

        {!isLoading && rows.length === 0 && (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
            <UserCircle className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400">
              Aucune sollicitation d'évaluation pour {currentUser.email}.
            </p>
          </div>
        )}

        {rows.map((r, i) => {
          const isDone = r.impact.reponse === 'oui';
          return (
            <div key={r.impact.id_impact ?? i} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/demandes/${r.demande.numero_demande}`}
                    className="font-mono text-xs font-bold text-teal-700 hover:underline"
                  >
                    {r.demande.numero_chronologique}
                  </Link>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {isDone ? 'Répondu' : 'En attente'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">{r.demande.sujet_changement}</p>
                {r.impact.commentaire && (
                  <p className="text-[11px] text-slate-600 italic mt-1">« {r.impact.commentaire} »</p>
                )}
              </div>
              {!isDone && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => {
                    setActiveRow(r);
                    setComment('');
                    setIsModalOpen(true);
                  }}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Rendre mon avis
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        title={`Avis de service — ${activeRow?.impact.service ?? ''}`}
        variant="success"
        confirmLabel="Transmettre l'avis"
        isLoading={isSubmitting}
        description={
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-900">{activeRow?.demande.sujet_changement}</strong>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeRow?.demande.numero_chronologique} • {activeRow?.impact.fonction}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Avis détaillé <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Impact sur procédures, équipements, personnel, autorisations..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              Votre avis sera horodaté et signé électroniquement dans Service_impactees.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ResponsablePage;