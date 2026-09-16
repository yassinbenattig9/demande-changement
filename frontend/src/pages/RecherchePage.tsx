import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCcw, Download, FileSearch } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable, Column } from '../components/ui/DataTable';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, normalizeWorkflowState } from '../types';
import { formatDateFr } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const EMPTY_FILTERS = {
  numero: '',
  sujet: '',
  demandeur: '',
  service: 'all',
  type: 'all',
  statut: 'all',
  site: 'all',
  classement: 'all',
  dateDebut: '',
  dateFin: '',
};

export const RecherchePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { currentUser, permissions } = useAuth();

  const [allDemandes, setAllDemandes] = useState<Demande[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState<Demande[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getDemandes()
      .then((list) => setAllDemandes(list))
      .catch(() => {
        error('Erreur de chargement', 'Impossible de charger les demandes.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const isFilterActive = Object.values(filters).some((v) => v !== 'all' && v !== '');

  const runSearch = () => {
    const q = filters.numero.trim().toLowerCase();
    const flux = filters.sujet.trim().toLowerCase();
    const demandeur = filters.demandeur.trim().toLowerCase();
    const res = allDemandes.filter((d) => {
      if (q && !(
        d.numero_chronologique.toLowerCase().includes(q) ||
        String(d.numero_demande).includes(q)
      )) return false;
      if (flux && !d.sujet_changement.toLowerCase().includes(flux)) return false;
      if (demandeur && !(d.nom_demandeur ?? '').toLowerCase().includes(demandeur)) return false;
      if (filters.service !== 'all' && d.service_demandeur !== filters.service) return false;
      if (filters.type !== 'all' && d.type_changement !== filters.type) return false;
      if (filters.statut !== 'all' && normalizeWorkflowState(d.etat_demande) !== filters.statut) return false;
      if (filters.site !== 'all' && d.site !== filters.site) return false;
      if (filters.classement !== 'all' && d.classement_changement !== filters.classement) return false;
      if (filters.dateDebut && d.date_edition < filters.dateDebut) return false;
      if (filters.dateFin && d.date_edition > filters.dateFin) return false;
      return true;
    });
    setResults(res);
    setHasSearched(true);
    success('Recherche exécutée', `${res.length} demande(s) trouvée(s).`);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setResults([]);
    setHasSearched(false);
  };

  const globalServices = Array.from(new Set(allDemandes.map((d) => d.service_demandeur).filter(Boolean)));

  const columns: Column<Demande>[] = [
    {
      header: 'N° Chrono',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/demandes/${row.numero_demande}`)}
          className="font-mono text-xs font-bold text-teal-700 hover:underline"
        >
          {row.numero_chronologique}
        </button>
      ),
      sortable: true,
      className: 'w-24',
    },
    {
      header: 'Demande',
      accessor: (row) => (
        <div className="min-w-[240px]">
          <p
            onClick={() => navigate(`/demandes/${row.numero_demande}`)}
            className="text-xs font-semibold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-1"
          >
            {row.sujet_changement}
          </p>
          <p className="text-[11px] text-slate-500">
            {row.designation} • <span className="font-mono">{row.codes}</span>
          </p>
        </div>
      ),
    },
    {
      header: 'Statut',
      accessor: (row) => <StatusBadge status={row.etat_demande} size="sm" />,
      sortable: true,
    },
    {
      header: 'Type / Site',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-slate-900">{row.type_changement}</p>
          <p className="text-[11px] text-slate-500">{row.site}</p>
        </div>
      ),
    },
    {
      header: 'Criticité',
      accessor: (row) => (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            row.classement_changement === 'Urgent'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : row.classement_changement === 'Faible'
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {row.classement_changement}
        </span>
      ),
    },
    {
      header: 'Demandeur',
      accessor: (row) => (
        <div className="text-xs">
          <p className="text-slate-900 font-medium">{row.nom_demandeur}</p>
          <p className="text-[11px] text-slate-500">{row.service_demandeur}</p>
        </div>
      ),
    },
    {
      header: 'Éditée le',
      accessor: (row) => <span className="font-mono text-xs text-slate-700">{formatDateFr(row.date_edition)}</span>,
      sortable: true,
    },
  ];

  const selectCls =
    'px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600';
  const labelCls = 'text-[11px] font-semibold text-slate-600 mb-1 block';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation & Recherche multicritères"
        subtitle="Critères combinables : numéro, sujet, demandeur, service, type, statut, site, criticité, période d'édition."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Recherche' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-mono">
            {results.length} résultat(s)
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {currentUser && permissions.peut_consulter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => success('Export GxP', 'Résultats de recherche exportés (CSV / XLSX).')}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Exporter
              </Button>
            )}
          </div>
        }
      />

      {/* Formulaire de recherche avancée */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <SlidersHorizontal className="w-4 h-4 text-teal-600" />
          Critères de recherche
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>N° chronologique / N° demande</label>
            <input
              value={filters.numero}
              onChange={(e) => setFilters({ ...filters, numero: e.target.value })}
              placeholder="ex : 26/004 ou 1003"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className={labelCls}>Sujet de changement</label>
            <input
              value={filters.sujet}
              onChange={(e) => setFilters({ ...filters, sujet: e.target.value })}
              placeholder="Texte contenu dans le sujet..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className={labelCls}>Demandeur (nom)</label>
            <input
              value={filters.demandeur}
              onChange={(e) => setFilters({ ...filters, demandeur: e.target.value })}
              placeholder="ex : Camille Durant"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className={labelCls}>Service demandeur</label>
            <select value={filters.service} onChange={(e) => setFilters({ ...filters, service: e.target.value })} className={`${selectCls} w-full`}>
              <option value="all">Tous</option>
              {globalServices.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type de changement</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className={`${selectCls} w-full`}>
              <option value="all">Tous</option>
              {['Procédé', 'Équipement', 'Matière première', 'Documentation', 'Système informatisé', 'Locaux / Utilités', 'Autres'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Statut du workflow</label>
            <select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} className={`${selectCls} w-full`}>
              <option value="all">Tous</option>
              <option value="demande_éditée">Demande éditée</option>
              <option value="acceptation_responsable_service">Acceptation Resp. Service</option>
              <option value="approbation_directeur_qualité">Approbation Directeur QA</option>
              <option value="approbation_PRT">Approbation PRT</option>
              <option value="Demande de changement Impact défini">Impact défini</option>
              <option value="Demande de changement en cours">En cours d'exécution</option>
              <option value="clôturée_validée">Clôturée & Validée</option>
              <option value="demande_incomplète">Demande incomplète</option>
              <option value="refusée">Refusée</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Site</label>
            <select value={filters.site} onChange={(e) => setFilters({ ...filters, site: e.target.value })} className={`${selectCls} w-full`}>
              <option value="all">Tous</option>
              <option value="SS">SS</option>
              <option value="JO">JO</option>
              <option value="EF">EF</option>
              <option value="JO + EF">JO + EF</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Criticité</label>
            <select value={filters.classement} onChange={(e) => setFilters({ ...filters, classement: e.target.value })} className={`${selectCls} w-full`}>
              <option value="all">Toutes</option>
              <option value="Urgent">Urgent</option>
              <option value="Standard">Standard</option>
              <option value="Faible">Faible</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Éditée après le (jj/mm/aaaa)</label>
            <input
              value={filters.dateDebut}
              onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
              placeholder="01/01/2026"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className={labelCls}>Éditée avant le (jj/mm/aaaa)</label>
            <input
              value={filters.dateFin}
              onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
              placeholder="31/12/2026"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={runSearch} leftIcon={<Search className="w-4 h-4" />}>
            Rechercher
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Réinitialiser
          </Button>
          {isFilterActive && (
            <span className="text-[11px] text-slate-500 ml-auto">Critères actifs — champs non vides appliqués.</span>
          )}
        </div>
      </div>

      {/* Résultats */}
      {hasSearched ? (
        <DataTable
          data={results}
          columns={columns}
          keyExtractor={(item) => item.numero_demande}
          searchableKey={(r) => `${r.numero_chronologique} ${r.sujet_changement} ${r.nom_demandeur ?? ''} ${r.service_demandeur}`}
          searchPlaceholder="Affiner les résultats..."
          isLoading={isLoading}
          emptyTitle="Aucune demande ne correspond aux critères."
        />
      ) : (
        <div className="p-10 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-2">
          <FileSearch className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Recherche du registre GxP</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Combinez plusieurs critères pour filtrer l'ensemble des demandes inscrites au registre
            DCMEDICIS, puis lancez la recherche.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecherchePage;