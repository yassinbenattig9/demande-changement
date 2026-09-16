import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileStack,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../components/ui/ToastContext';
import { apiClient, DashboardStats } from '../lib/api-client';

export const StatistiquesPage: React.FC = () => {
  const { error } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      setStats(await apiClient.getDashboardStats());
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de calculer les statistiques.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Calcul des indicateurs DCMEDICIS...</p>
      </div>
    );
  }

  const maxRepartition = Math.max(...stats.repartitionParStatut.map((r) => r.count), 1);
  const maxEvolution = Math.max(...stats.evolutionMensuelle.map((e) => Math.max(e.soumises, e.validees)), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques Change Control"
        subtitle="Indicateurs de suivi du processus de gestion des changements (activité, délais, statuts)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Statistiques' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800">
            DCMEDICIS — KPIs GxP
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Demandes totales"
          value={stats.totalDemandes}
          icon={<FileStack className="w-5 h-5" />}
          variant="indigo"
          subtitle="Sur la période observée"
          trend={{ value: `+${stats.evolutionMensuelle.reduce((a, m) => a + m.soumises, 0)}`, direction: 'up', label: '2024' }}
        />
        <StatCard
          title="En attente d'approbation"
          value={stats.enAttenteApprobation}
          icon={<Clock className="w-5 h-5" />}
          variant="amber"
          subtitle="Revues hiérarchique / QA / PRT"
        />
        <StatCard
          title="Clôturées validées"
          value={stats.clotureesValidees}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
          subtitle="Changements mis en œuvre"
        />
        <StatCard
          title="En retard sur échéance"
          value={stats.enRetardCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="rose"
          subtitle="Date MEP souhaitée dépassée"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Répartition par statut de workflow</h3>
          </div>
          <div className="space-y-3">
            {stats.repartitionParStatut.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{r.name}</span>
                  <span className="font-mono font-bold text-slate-900">{r.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(r.count / maxRepartition) * 100}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Évolution mensuelle (soumises / validées)</h3>
          </div>
          <div className="space-y-3">
            {stats.evolutionMensuelle.map((m) => (
              <div key={m.mois}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-slate-500">{m.mois}</span>
                  <span className="text-slate-700">
                    {m.soumises} soumises • <span className="text-emerald-700">{m.validees} validées</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(m.soumises / maxEvolution) * 100}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.validees / maxEvolution) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Taux de respect des délais"
          value={`${stats.tauxRespectDelaiPct?.toFixed(1)}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="teal"
          subtitle="MEP réalisées à la date souhaitée"
        />
        <StatCard
          title="Délai moyen de traitement"
          value={`${stats.délaiMoyenJours.toFixed(1)} j`}
          icon={<Clock className="w-5 h-5" />}
          variant="amber"
          subtitle="De l'édition à la MEP souhaitée"
        />
        <StatCard
          title="Demandes en cours d'exécution"
          value={stats.enCoursExecution}
          icon={<BarChart3 className="w-5 h-5" />}
          variant="indigo"
          subtitle="Changements à mettre en œuvre"
        />
      </div>
    </div>
  );
};

export default StatistiquesPage;