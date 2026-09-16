import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (options: { title: string; description?: string; type?: ToastType }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = 'info' }: { title: string; description?: string; type?: ToastType }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, description, type };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback((title: string, description?: string) => addToast({ title, description, type: 'success' }), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast({ title, description, type: 'error' }), [addToast]);
  const warning = useCallback((title: string, description?: string) => addToast({ title, description, type: 'warning' }), [addToast]);
  const info = useCallback((title: string, description?: string) => addToast({ title, description, type: 'info' }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div
        id="toast-container"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl transition-all duration-200 transform translate-y-0 backdrop-blur-md',
              t.type === 'success' && 'bg-white text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/20',
              t.type === 'error' && 'bg-white text-rose-950 border-rose-300 ring-1 ring-rose-400/20',
              t.type === 'warning' && 'bg-white text-amber-950 border-amber-300 ring-1 ring-amber-400/20',
              t.type === 'info' && 'bg-white text-slate-900 border-slate-300 ring-1 ring-slate-400/20'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-teal-600" />}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">{t.title}</p>
              {t.description && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé au sein de ToastProvider');
  return ctx;
};
