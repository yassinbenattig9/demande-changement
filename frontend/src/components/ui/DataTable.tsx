import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key?: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchableKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  actionsSlot?: React.ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  searchPlaceholder = 'Rechercher dans la liste...',
  searchableKey,
  onRowClick,
  actionsSlot,
  pageSize = 8,
  emptyTitle = 'Aucun élément trouvé',
  emptyDescription = 'Aucune donnée ne correspond aux critères de recherche actuels.',
  emptyAction,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrage
  const filteredData = useMemo(() => {
    if (!search.trim() || !searchableKey) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      const val =
        typeof searchableKey === 'function'
          ? searchableKey(item)
          : String((item as any)[searchableKey] ?? '');
      return val.toLowerCase().includes(q);
    });
  }, [data, search, searchableKey]);

  // Tri
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const res = valA > valB ? 1 : -1;
      return sortDir === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Barre de contrôle supérieure */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Effacer
            </button>
          )}
        </div>

        {actionsSlot && <div className="flex items-center gap-2">{actionsSlot}</div>}
      </div>

      {/* Tableau responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {columns.map((col, colIdx) => (
                <th
                  key={col.key ?? `${col.header ?? 'col'}-${colIdx}`}
                  className={cn(
                    'py-3 px-4 select-none whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer hover:text-slate-800 transition-colors',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'flex-row-reverse'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((c, j) => (
                    <td key={j} className="py-3.5 px-4">
                      <Skeleton className="h-5 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const key = keyExtractor(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors duration-150 group',
                      onRowClick
                        ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'
                        : 'hover:bg-slate-50/60'
                    )}
                  >
                    {columns.map((col, idx) => (
                      <td
                        key={col.key || `col-${idx}`}
                        className={cn(
                          'py-3 px-4 text-slate-800 group-hover:text-slate-900 align-middle',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className
                        )}
                      >
                        {col.accessor
                          ? col.accessor(row)
                          : col.render
                          ? col.render(row)
                          : col.key
                          ? (row as any)[col.key]
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Compteur */}
      <div className="p-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/70">
        <div>
          Affichage de{' '}
          <span className="font-semibold text-slate-800 font-mono tabular-nums">
            {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{' '}
          à{' '}
          <span className="font-semibold text-slate-800 font-mono tabular-nums">
            {Math.min(currentPage * pageSize, sortedData.length)}
          </span>{' '}
          sur{' '}
          <span className="font-semibold text-slate-800 font-mono tabular-nums">
            {sortedData.length}
          </span>{' '}
          enregistrements
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 font-mono tabular-nums text-slate-700">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
