import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  className,
}) => {
  return (
    <div className={cn('mb-6 pb-4 border-b border-slate-200 space-y-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-slate-500">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-teal-700 transition-colors truncate max-w-[200px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn('truncate max-w-[250px]', isLast && 'text-slate-900 font-semibold')}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};
