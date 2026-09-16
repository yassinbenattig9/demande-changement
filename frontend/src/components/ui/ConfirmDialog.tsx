import React, { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'warning',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const iconMap = {
    danger: <ShieldAlert className="w-6 h-6 text-rose-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    primary: <Info className="w-6 h-6 text-teal-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
  };

  const buttonVariantMap = {
    danger: 'destructive' as const,
    warning: 'secondary' as const,
    primary: 'primary' as const,
    success: 'success' as const,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Fermer la boîte de dialogue"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="shrink-0 p-3 rounded-xl bg-slate-100 border border-slate-200">
            {iconMap[variant]}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariantMap[variant]}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
