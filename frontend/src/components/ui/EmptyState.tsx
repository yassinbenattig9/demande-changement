import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto',
        className
      )}
    >
      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 mb-3.5 shadow-2xs">
        {icon || <FileQuestion className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
