import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StepItem {
  id: number;
  title: string;
  description?: string;
}

export interface WizardStepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Barre de progression globale */}
      <div className="relative mb-6">
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Étapes détaillées */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <button
              key={step.id}
              type="button"
              disabled={isUpcoming && !onStepClick}
              onClick={() => onStepClick && onStepClick(step.id)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200',
                isCurrent &&
                  'bg-teal-50/80 border-teal-500 ring-1 ring-teal-500/30 shadow-xs',
                isCompleted &&
                  'bg-white border-slate-200 hover:border-slate-300 text-slate-700',
                isUpcoming &&
                  'bg-slate-50 border-slate-200 opacity-60 cursor-default'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors',
                  isCompleted && 'bg-emerald-600 text-white',
                  isCurrent && 'bg-teal-600 text-white ring-4 ring-teal-600/20',
                  isUpcoming && 'bg-slate-200 text-slate-500'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-xs font-semibold truncate',
                    isCurrent ? 'text-teal-800' : isCompleted ? 'text-slate-800' : 'text-slate-500'
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
