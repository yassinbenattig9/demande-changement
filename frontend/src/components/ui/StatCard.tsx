import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'default' | 'teal' | 'indigo' | 'amber' | 'rose' | 'emerald';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const accentGlow = {
    default: 'hover:border-slate-300',
    teal: 'hover:border-teal-400 hover:shadow-xs',
    indigo: 'hover:border-indigo-400 hover:shadow-xs',
    amber: 'hover:border-amber-400 hover:shadow-xs',
    rose: 'hover:border-rose-400 hover:shadow-xs',
    emerald: 'hover:border-emerald-400 hover:shadow-xs',
  };

  const iconBg = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs transition-all duration-200',
        accentGlow[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900">
              {value}
            </span>
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              'p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 duration-200',
              iconBg[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 font-medium ml-auto',
                trend.direction === 'up' && 'text-emerald-700 font-semibold',
                trend.direction === 'down' && 'text-rose-700 font-semibold',
                trend.direction === 'neutral' && 'text-slate-500'
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
              <span>{trend.value}</span>
              {trend.label && <span className="text-slate-400 font-normal">({trend.label})</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
