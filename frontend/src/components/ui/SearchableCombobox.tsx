import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface SearchableComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string, option?: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner un produit ou équipement...',
  searchPlaceholder = 'Rechercher un produit...',
  disabled = false,
  error,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())) ||
      (opt.badge && opt.badge.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-sm transition-all duration-150',
          'bg-white border-slate-300 hover:border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/30',
          error && 'border-rose-500 ring-1 ring-rose-500/40',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100'
        )}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium text-slate-900 truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2 text-slate-400 shrink-0">
          {selectedOption && !disabled && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Effacer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                Aucun produit correspondant trouvé
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-teal-50 text-teal-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{opt.label}</span>
                        {opt.badge && (
                          <span className="font-mono text-[10px] text-teal-800 px-1 bg-teal-50 rounded border border-teal-200">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {opt.description}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};
