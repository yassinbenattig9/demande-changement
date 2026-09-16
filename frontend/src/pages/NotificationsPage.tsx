import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, FileText, MessageSquare } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { NotificationItem } from '../types';
import { formatDateFr } from '../lib/utils';

export const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      setNotifications(await apiClient.getNotifications(currentUser.email));
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const displayed = notifications.filter((n) => filter === 'all' || n.etat_lecture === '0');

  const markAllRead = async () => {
    try {
      for (const n of notifications) {
        if (n.etat_lecture === '0') await apiClient.markNotificationRead(n.ROWID);
      }
      success('Tout est lu', 'Toutes les notifications ont été marquées comme lues.');
      await loadNotifications();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de mettre à jour les notifications.');
    }
  };

  const handleOpen = async (n: NotificationItem) => {
    if (n.etat_lecture === '0') {
      try {
        await apiClient.markNotificationRead(n.ROWID);
        await loadNotifications();
      } catch {
        /* silencieux */
      }
    }
    if (n.lien) navigate(n.lien);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={`Alertes et tâches en attente pour ${currentUser.email} (DCMEDICIS.dbo.Notifications).`}
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Notifications' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
            {notifications.filter((n) => n.etat_lecture === '0').length} non lue(s)
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={notifications.every((n) => n.etat_lecture === '1')}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            Tout marquer comme lu
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
          }`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
          }`}
        >
          Non lues ({notifications.filter((n) => n.etat_lecture === '0').length})
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="p-8 text-center text-slate-400 text-xs">Chargement des notifications...</div>}

        {!isLoading && displayed.length === 0 && (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400">Aucune notification pour ce filtre.</p>
          </div>
        )}

        {displayed.map((n) => {
          const isUnread = n.etat_lecture === '0';
          return (
            <button
              key={n.ROWID}
              onClick={() => handleOpen(n)}
              className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                isUnread
                  ? 'bg-white border-teal-200 shadow-xs hover:border-teal-400'
                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUnread ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {n.lien.includes('/demandes') ? <FileText className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>{n.titre}</p>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {formatDateFr(n.date, true)} • {n.email_concerne}
                  </p>
                  {n.lien && (
                    <p className="text-[11px] text-teal-700 font-medium mt-1 group-hover:underline">
                      Ouvrir → {n.lien}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;