import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WORKFLOW_PIPELINE, HistoriqueAudit, normalizeWorkflowState } from '../../types';

export interface WorkflowTimelineProps {
  currentStatus: string;
  className?: string;
}

/**
 * Visual Workflow Pipeline for Medicis GxP approvals
 */
export const WorkflowPipeline: React.FC<WorkflowTimelineProps> = ({
  currentStatus,
  className,
}) => {
  const norm = normalizeWorkflowState(currentStatus);

  // Déterminer l'indice d'étape courante (1 à 6)
  let activeIndex = 1;
  if (norm === 'demande_éditée') activeIndex = 1;
  else if (norm.startsWith('acceptation_responsable_service') || norm.startsWith('acceptation_coordinateur')) activeIndex = 2;
  else if (norm === 'approbation_directeur_qualité') activeIndex = 3;
  else if (norm === 'approbation_PRT') activeIndex = 4;
  else if (norm === 'Demande de changement Impact défini') activeIndex = 5;
  else if (norm === 'Demande de changement en cours' || norm === 'clôturée_validée') activeIndex = 6;
  else if (norm === 'refusée') activeIndex = 3; // Marqué au niveau où c'est refusé

  const isRefused = norm === 'refusée';

  return (
    <div className={cn('w-full py-2', className)}>
      <div className="relative flex items-center justify-between">
        {/* Ligne de connexion d'arrière-plan */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
        {/* Ligne d'avancement active */}
        <div
          className={cn(
            'absolute left-6 top-1/2 -translate-y-1/2 h-0.5 transition-all duration-500 -z-0',
            isRefused ? 'bg-rose-500' : 'bg-gradient-to-r from-teal-600 to-indigo-600'
          )}
          style={{
            width: `calc(${((Math.min(activeIndex, 6) - 1) / 5) * 100}% - 24px)`,
          }}
        />

        {WORKFLOW_PIPELINE.map((step) => {
          const isDone = step.index < activeIndex;
          const isCurrent = step.index === activeIndex;
          const isPending = step.index > activeIndex;

          return (
            <div key={step.index} className="flex flex-col items-center relative z-10 group">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold border-2 transition-all duration-200',
                  isDone && 'bg-teal-50 border-teal-600 text-teal-700 shadow-xs',
                  isCurrent && !isRefused && 'bg-teal-600 border-teal-700 text-white ring-4 ring-teal-600/20 shadow-md scale-110',
                  isCurrent && isRefused && 'bg-rose-600 border-rose-700 text-white ring-4 ring-rose-600/20 scale-110',
                  isPending && 'bg-white border-slate-300 text-slate-400'
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                ) : isCurrent && isRefused ? (
                  <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5 stroke-[2.5] animate-pulse" />
                ) : (
                  step.index
                )}
              </div>

              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs font-semibold whitespace-nowrap',
                    isCurrent ? (isRefused ? 'text-rose-700' : 'text-teal-800') : isDone ? 'text-slate-800' : 'text-slate-500'
                  )}
                >
                  {step.shortLabel}
                </p>
                <p className="text-[10px] text-slate-500 whitespace-nowrap hidden sm:block">
                  {step.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Piste d'audit / Timeline d'historique chronologique conforme 21 CFR Part 11
 */
export const AuditTimeline: React.FC<{
  events: HistoriqueAudit[];
  className?: string;
}> = ({ events, className }) => {
  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      {/* Ligne verticale */}
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

      {events.map((evt, idx) => (
        <div key={evt.id_historique || idx} className="relative group">
          {/* Pastille */}
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-teal-600 flex items-center justify-center text-teal-600 shadow-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">{evt.action}</span>
              <span className="text-[11px] font-mono text-slate-500">{evt.date}</span>
            </div>

            <p className="text-xs text-slate-600 mt-1">
              Par <span className="font-medium text-slate-900">{evt.utilisateur}</span>
              {evt.page_source && (
                <span className="text-slate-400"> • {evt.page_source}</span>
              )}
            </p>

            {evt.commentaire && (
              <p className="text-xs text-slate-700 italic mt-2 p-2.5 rounded-lg bg-white border border-slate-200">
                « {evt.commentaire} »
              </p>
            )}

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 font-mono">
              <span className="flex items-center gap-1 text-teal-700 font-medium">
                <ShieldCheck className="w-3 h-3" /> Conforme 21 CFR Part 11
              </span>
              <span className="truncate max-w-[200px]" title={evt.numero_chronologique}>
                N° Chrono: {evt.numero_chronologique}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
