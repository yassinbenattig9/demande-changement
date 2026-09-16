import React from 'react';
import { cn } from '../../lib/utils';
import { normalizeWorkflowState, WORKFLOW_LABELS, WorkflowState } from '../../types';
import {
  CheckCircle,
  Clock,
  AlertOctagon,
  FileEdit,
  ShieldCheck,
  Users,
  Compass,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center font-medium rounded-full whitespace-nowrap transition-colors select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-teal-50 text-teal-800 border border-teal-200',
    purple: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

/**
 * Badge spécialisé pour les 12 statuts de workflow Medicis Change Control.
 * Gère le trim des espaces historiques (' Demande en cours') et affiche l'icône GxP adaptée.
 */
export const StatusBadge: React.FC<{
  status?: string | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}> = ({ status, size = 'md', showIcon = true, className }) => {
  const normalized: WorkflowState = normalizeWorkflowState(status);

  const config: Record<
    WorkflowState,
    { label: string; variant: BadgeProps['variant']; icon: React.ReactNode }
  > = {
    'demande_éditée': {
      label: 'Demande éditée',
      variant: 'default',
      icon: <FileEdit className="w-3.5 h-3.5" />,
    },
    'acceptation_coordinateur_changement': {
      label: 'Coord. Changement',
      variant: 'purple',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    'acceptation_responsable_service': {
      label: 'Resp. Service N+1',
      variant: 'warning',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    'acceptation_chargé_changement': {
      label: 'Chargé Changement',
      variant: 'purple',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    'acceptation_responsable_changement': {
      label: 'Resp. Changement',
      variant: 'purple',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    'approbation_directeur_qualité': {
      label: 'Dir. Qualité (QA)',
      variant: 'info',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    'approbation_PRT': {
      label: 'Comité PRT',
      variant: 'warning',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    'Demande de changement Impact défini': {
      label: 'Impacts définis',
      variant: 'purple',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    'Demande de changement en cours': {
      label: 'En exécution',
      variant: 'info',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
    'clôturée_validée': {
      label: 'Clôturée & validée',
      variant: 'success',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    'refusée': {
      label: 'Refusée',
      variant: 'destructive',
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
    },
    'demande_incomplète': {
      label: 'Incomplète',
      variant: 'warning',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  };

  const item = config[normalized] || {
    label: normalized,
    variant: 'default' as const,
    icon: <Clock className="w-3.5 h-3.5" />,
  };

  return (
    <Badge
      variant={item.variant}
      size={size}
      className={cn('font-medium shadow-xs', className)}
      title={WORKFLOW_LABELS[normalized] || normalized}
    >
      {showIcon && item.icon}
      <span>{item.label}</span>
    </Badge>
  );
};
