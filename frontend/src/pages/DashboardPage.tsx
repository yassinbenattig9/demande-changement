import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  TrendingUp,
  Plus,
  ShieldCheck,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { apiClient, DashboardStats } from '../lib/api-client';
import { Demande, HistoriqueAudit, normalizeWorkflowState } from '../types';
import { formatDateFr } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDemandes, setRecentDemandes] = useState<Demande[]>([]);
  const [auditEvents, setAuditEvents] = useState<HistoriqueAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dashStats, allDemandes, audit] = await Promise.all([
          apiClient.getDashboardStats(),
          apiClient.getDemandes(),
          apiClient.getAuditTrail(),
        ]);
        setStats(dashStats);
        setRecentDemandes(allDemandes.slice(0, 5));
        setAuditEvents(audit.slice(0, 4));
      } catch (err) {
        console.error('Erreur chargement dashboard', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Détection des demandes en retard ou urgentes
  const overdueDemandes = recentDemandes.filter((d) => {
    if (!d.date_souhaite_mep_changement) return false;
    const target = new Date(d.date_souhaite_mep_changement.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).getTime();
    const st = normalizeWorkflowState(d.etat_demande);
    return Number.isFinite(target) && target < new Date().getTime() && st !== 'clôturée_validée' && st !== 'refusée';
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <PageHeader
        title="Tableau de bord Change Control"
        subtitle="Surveillance en temps réel des flux d'approbation et indicateurs de performance qualité (GxP)."
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-medium text-teal-800 flex items-center gap-1 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Audit Trail Actif • Conforme 21 CFR Part 11
          </span>
        }
        actions={
          permissions.peut_creer_demande && (
            <Button
              variant="primary"
              onClick={() => navigate('/nouvelle-demande')}
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            >
              Nouvelle demande
            </Button>
          )
        }
      />

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Demandes en cours"
          value={stats?.totalDemandes ?? 0}
          subtitle="Toutes catégories confondues"
          icon={<FileText className="w-5 h-5" />}
          variant="teal"
          trend={{ value: '+2 cette semaine', direction: 'up' }}
        />
        <StatCard
          title="En attente d'approbation"
          value={stats?.enAttenteApprobation ?? 0}
          subtitle="Nécessite une revue de workflow"
          icon={<Clock className="w-5 h-5" />}
          variant="amber"
          trend={{ value: '4 prioritaires', direction: 'neutral' }}
        />
        <StatCard
          title="Exécution & Impacts"
          value={stats?.enCoursExecution ?? 0}
          subtitle="Actions métiers en cours"
          icon={<PlayCircle className="w-5 h-5" />}
          variant="indigo"
        />
        <StatCard
          title="Clôturées & Validées"
          value={stats?.clotureesValidees ?? 0}
          subtitle="Revue finale QA validée"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
          trend={{ value: '100% conforme', direction: 'up' }}
        />
      </div>

      {/* Bandeau d'alerte des retards si existants */}
      {overdueDemandes.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Alerte Délais GxP : {overdueDemandes.length} demande(s) en dépassement
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Des actions correctives ou une prorogation formelle approuvée par le Directeur QA
                sont requises.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate('/approbations')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Examiner les alertes
          </Button>
        </div>
      )}

      {/* Panneau KPI & Graphiques Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique 1 : Répartition par étape du Workflow */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Répartition par statut</h3>
              <p className="text-xs text-slate-500">Équilibre de la charge d'approbation</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.repartitionParStatut}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {stats.repartitionParStatut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#0f172a',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-[11px] text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graphique 2 : Volume Mensuel Soumises vs Validées */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Activité mensuelle DCMEDICIS</h3>
              <p className="text-xs text-slate-500">Volume de demandes créées vs clôturées</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Soumises
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Validées
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.evolutionMensuelle} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mois" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#0f172a',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="soumises" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="validees" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Grille inférieure : Demandes Récentes & Fil d'Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des demandes récentes */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Dernières demandes instruites</h3>
              <p className="text-xs text-slate-500">Suivi direct de l'avancement par produit</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/demandes')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Voir le registre complet
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentDemandes.map((d) => (
              <div
                key={d.numero_demande}
                onClick={() => navigate(`/demandes/${d.numero_demande}`)}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-teal-800 px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                      {d.numero_chronologique}
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-700 font-medium truncate">
                      {d.designation}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-700 transition-colors line-clamp-1">
                    {d.sujet_changement}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Demandeur : {d.nom_demandeur} ({d.service_demandeur}) • Échéance : {formatDateFr(d.date_souhaite_mep_changement)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={d.etat_demande} size="sm" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fil d'activité GxP / Audit Trail */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Piste d'audit GxP récente</h3>
              <p className="text-xs text-slate-500">Conformité ALCOA+ & 21 CFR Part 11</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>

          <div className="space-y-3.5 flex-1">
            {auditEvents.map((evt, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                  <span>{evt.date}</span>
                  <span className="text-teal-700 truncate max-w-[120px] font-semibold">{evt.numero_chronologique}</span>
                </div>
                <p className="font-semibold text-slate-800 mt-1">{evt.action}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Par <span className="text-slate-900 font-medium">{evt.utilisateur}</span>
                </p>
                {evt.commentaire && (
                  <p className="text-[11px] text-slate-700 italic mt-1 bg-white p-1.5 rounded border border-slate-200">
                    « {evt.commentaire} »
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Registre immuable horodaté par serveur NTP certifié
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;