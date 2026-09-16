import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const NewChangeRequestPage = React.lazy(() => import('./pages/NewChangeRequestPage'));
const RequestDetailPage = React.lazy(() => import('./pages/RequestDetailPage'));
const ApprovalQueuePage = React.lazy(() => import('./pages/ApprovalQueuePage'));
const UserAdminPage = React.lazy(() => import('./pages/UserAdminPage'));
const RequestsListPage = React.lazy(() => import('./pages/RequestsListPage'));
const PlansActionPage = React.lazy(() => import('./pages/PlansActionPage'));
const EvaluationsPage = React.lazy(() => import('./pages/EvaluationsPage'));
const ReunionsPage = React.lazy(() => import('./pages/ReunionsPage'));
const DiffusionPage = React.lazy(() => import('./pages/DiffusionPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const HistoriquePage = React.lazy(() => import('./pages/HistoriquePage'));
const StatistiquesPage = React.lazy(() => import('./pages/StatistiquesPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ForbiddenPage = React.lazy(() => import('./pages/ForbiddenPage'));
const ParametragePage = React.lazy(() => import('./pages/ParametragePage'));
const ApprobateursPage = React.lazy(() => import('./pages/ApprobateursPage'));
const MailingPage = React.lazy(() => import('./pages/MailingPage'));
const ParametresPage = React.lazy(() => import('./pages/ParametresPage'));
const ProfilPage = React.lazy(() => import('./pages/ProfilPage'));
const ResponsablePage = React.lazy(() => import('./pages/ResponsablePage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const RecherchePage = React.lazy(() => import('./pages/RecherchePage'));
const AvisServicesPage = React.lazy(() => import('./pages/AvisServicesPage'));
const DiffusionListePage = React.lazy(() => import('./pages/DiffusionListePage'));
const DiffusionDemandePage = React.lazy(() => import('./pages/DiffusionDemandePage'));
const AidePage = React.lazy(() => import('./pages/AidePage'));
const WorkflowAdminPage = React.lazy(() => import('./pages/WorkflowAdminPage'));
const RolesAdminPage = React.lazy(() => import('./pages/RolesAdminPage'));

const RouteLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      <p className="text-xs text-slate-400 font-medium">Chargement…</p>
    </div>
  </div>
);

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <RouteLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <React.Suspense fallback={<RouteLoader />}>
              <Routes>
                {/* Route publique : Authentification */}
                <Route path="/login" element={<LoginPage />} />

                {/* Routes protégées avec coquille de navigation (AppLayout) */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/approbations" element={<ApprovalQueuePage />} />
                  <Route path="/demandes" element={<RequestsListPage mode="registre" />} />
                  <Route path="/demandes/mes-demandes" element={<RequestsListPage mode="mes" />} />
                  <Route path="/demandes/en-attente" element={<RequestsListPage mode="en-attente" />} />
                  <Route path="/demandes/validees" element={<RequestsListPage mode="validees" />} />
                  <Route path="/demandes/incompletes" element={<RequestsListPage mode="incompletes" />} />
                  <Route path="/demandes/recherche" element={<RecherchePage />} />
                  <Route path="/demandes/:id" element={<RequestDetailPage />} />
                  <Route path="/nouvelle-demande" element={<NewChangeRequestPage />} />
                  <Route path="/demandes/nouvelle" element={<NewChangeRequestPage />} />
                  <Route path="/avis-services" element={<AvisServicesPage />} />
                  <Route path="/plans-action" element={<PlansActionPage />} />
                  <Route path="/evaluations" element={<EvaluationsPage />} />
                  <Route path="/reunions" element={<ReunionsPage />} />
                  <Route path="/diffusion" element={<DiffusionPage />} />
                  <Route path="/diffusion/liste" element={<DiffusionListePage />} />
                  <Route path="/diffusion/demande/:id" element={<DiffusionDemandePage />} />
                  <Route path="/aide" element={<AidePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/historique" element={<HistoriquePage />} />
                  <Route path="/statistiques" element={<StatistiquesPage />} />
                  <Route path="/admin/utilisateurs" element={<UserAdminPage />} />
                  <Route path="/admin/parametrage" element={<ParametragePage />} />
                  <Route path="/admin/approbateurs" element={<ApprobateursPage />} />
                  <Route path="/admin/mailing" element={<MailingPage />} />
                  <Route path="/admin/parametres" element={<ParametresPage />} />
                  <Route path="/admin/workflow" element={<WorkflowAdminPage />} />
                  <Route path="/admin/roles" element={<RolesAdminPage />} />
                  <Route path="/profil" element={<ProfilPage />} />
                  <Route path="/responsable" element={<ResponsablePage />} />
                  <Route path="/responsable/:domaine" element={<ResponsablePage />} />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                </Route>

                {/* Routes publiques : authentification et réinitialisation du mot de passe */}
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                {/* Page introuvable */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </React.Suspense>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}