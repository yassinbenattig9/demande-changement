import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Filter,
  Plus,
  Download,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { Demande, normalizeWorkflowState } from '../types';
import { formatDateFr } from '../lib/utils';

export type DemandesListMode =
  | 'registre'
  | 'mes'
  | 'en-attente'
  | 'validees'
  | 'incompletes';

const MODE_META: Record<DemandesListMode, { title: string; subtitle: string }> = {
  registre: {
    title: 'Registre Général des Demandes',
    subtitle: "Catalogue exhaustif des modifications en cours d'instruction, validées ou clôturées sur le site.",
  },
  mes: {
    title: 'Mes Demandes',
    subtitle: "Les demandes de changement que vous avez initiées en tant que demandeur.",
  },
  'en-attente': {
    title: 'Demandes en Attente',
    subtitle: "Les demandes encore actives dans le workflow d'approbation et de mise en œuvre.",
  },
  validees: {
    title: 'Demandes Validées',
    subtitle: "Demandes approuvées (PRT accepté), en cours de réalisation ou clôturées avec succès.",
  },
  incompletes: {
    title: 'Demandes Incomplètes',
    subtitle: "Demandes retournées au demandeur pour complément d'information (état 'demande_incomplète').",
  },
};

const TERMINAL_STATES = ['clôturée_validée', 'refusée', 'demande_incomplète'];

export const RequestsListPage: React.FC<{ mode?: DemandesListMode }> = ({ mode = 'registre' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { permissions, currentUser } = useAuth();
  const { success, error } = useToast();

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClassement, setSelectedClassement] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getDemandes()
      .then((list) => setDemandes(list))
      .catch(() => {
        error('Erreur de chargement', 'Impossible de charger les demandes.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const queryParam = searchParams.get('q') || '';

  const filteredData = demandes.filter((d) => {
    if (mode === 'mes' && d.demandeur !== currentUser.email) return false;

    if (mode === 'en-attente') {
      if (TERMINAL_STATES.includes(normalizeWorkflowState(d.etat_demande))) return false;
    }

    if (mode === 'validees') {
      const s = normalizeWorkflowState(d.etat_demande);
      if (!['Demande de changement Impact défini', 'Demande de changement en cours', 'clôturée_validée'].includes(s)) {
        return false;
      }
    }

    if (mode === 'incompletes' && normalizeWorkflowState(d.etat_demande) !== 'demande_incomplète') {
      return false;
    }

    if (selectedStatus !== 'all') {
      if (normalizeWorkflowState(d.etat_demande) !== selectedStatus) return false;
    }
    if (selectedClassement !== 'all' && d.classement_changement !== selectedClassement) {
      return false;
    }
    if (selectedType !== 'all' && d.type_changement !== selectedType) {
      return false;
    }
    if (queryParam) {
      const q = queryParam.toLowerCase();
      const match =
        d.sujet_changement.toLowerCase().includes(q) ||
        d.numero_chronologique.toLowerCase().includes(q) ||
        d.designation.toLowerCase().includes(q) ||
        (d.nom_demandeur ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const columns: Column<Demande>[] = [
    {
      header: 'N° Chrono',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/demandes/${row.numero_demande}`)}
          className="font-mono text-xs font-bold text-teal-700 hover:underline hover:text-teal-800"
        >
          {row.numero_chronologique}
        </button>
      ),
      sortable: true,
      className: 'w-24',
    },
    {
      header: 'Sujet de changement',
      accessor: (row) => (
        <div className="min-w-[220px]">
          <p
            onClick={() => navigate(`/demandes/${row.numero_demande}`)}
            className="text-xs font-semibold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-1"
          >
            {row.sujet_changement}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {row.designation} • <span className="font-mono">{row.codes}</span>
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Statut du Workflow',
      accessor: (row) => <StatusBadge status={row.etat_demande} size="sm" />,
      sortable: true,
    },
    {
      header: 'Type',
      accessor: (row) => (
        <span className="text-xs text-slate-700">{row.type_changement}</span>
      ),
      sortable: true,
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
      sortable: true,
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
      header: 'Échéance MEP',
      accessor: (row) => (
        <span className="font-mono text-xs text-slate-700">
          {formatDateFr(row.date_souhaite_mep_changement)}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={MODE_META[mode].title}
        subtitle={MODE_META[mode].subtitle}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-mono">
            {filteredData.length} dossiers
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => success('Export GxP', 'Registre complet exporté au format CSV / XLSX.')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Exporter
            </Button>
            {permissions.peut_creer_demande && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/nouvelle-demande')}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                Nouvelle demande
              </Button>
            )}
          </div>
        }
      />

      {/* Barre de filtres */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filtres :</span>
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          <option value="all">Tous les statuts</option>
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

        <select
          value={selectedClassement}
          onChange={(e) => setSelectedClassement(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          <option value="all">Toutes criticités</option>
          <option value="Urgent">Urgent</option>
          <option value="Standard">Standard</option>
          <option value="Faible">Faible</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          <option value="all">Tous types de changement</option>
          <option value="Procédé">Procédé</option>
          <option value="Équipement">Équipement</option>
          <option value="Matière première">Matière première</option>
          <option value="Documentation">Documentation</option>
          <option value="Système informatisé">Système informatisé</option>
          <option value="Locaux / Utilités">Locaux / Utilités</option>
          <option value="Autres">Autres</option>
        </select>

        {(selectedStatus !== 'all' || selectedClassement !== 'all' || selectedType !== 'all') && (
          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedClassement('all');
              setSelectedType('all');
            }}
            className="text-xs text-teal-700 hover:underline ml-auto font-medium"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Tableau des résultats */}
      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(item) => item.numero_demande}
        searchableKey="sujet_changement"
        searchPlaceholder="Rechercher par sujet de changement..."
        isLoading={isLoading}
      />
    </div>
  );
};

export default RequestsListPage;