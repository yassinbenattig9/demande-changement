import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NotificationItem } from '../../types';
import { apiClient } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const NotificationsDropdown: React.FC<{ email: string }> = ({ email }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.getNotifications(email).then(setNotifications).catch(() => {});
  }, [email]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.etat_lecture === '0').length;

  const handleItemClick = async (notif: NotificationItem) => {
    try {
      if (notif.etat_lecture === '0') {
        await apiClient.markNotificationRead(notif.ROWID);
        setNotifications((prev) =>
          prev.map((n) => (n.ROWID === notif.ROWID ? { ...n, etat_lecture: '1' } : n))
        );
      }
    } catch {}
    setIsOpen(false);
    if (notif.lien) {
      navigate(notif.lien);
    } else if (notif.id_demande) {
      navigate(`/demandes/${notif.id_demande}`);
    }
  };

  const markAllAsRead = async () => {
    try {
      for (const n of notifications.filter((item) => item.etat_lecture === '0')) {
        await apiClient.markNotificationRead(n.ROWID);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, etat_lecture: '1' as const })));
    } catch {}
  };

  const getIcon = (n: NotificationItem) => {
    const t = n.titre.toLowerCase();
    if (t.includes('approbation') || t.includes('aven')) return <Clock className="w-4 h-4 text-amber-600" />;
    if (t.includes('alerte') || t.includes('retard') || t.includes('butoir')) return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    if (t.includes('valid') || t.includes('clôture')) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    return <Bell className="w-4 h-4 text-teal-600" />;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white font-mono ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                  {unreadCount} non lues
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold transition-colors"
            >
              Tout voir
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications
                .slice()
                .sort((a, b) => b.ROWID - a.ROWID)
                .map((n) => (
                  <div
                    key={n.ROWID}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 text-left',
                      n.etat_lecture === '1'
                        ? 'opacity-70 hover:opacity-100 hover:bg-slate-50'
                        : 'bg-teal-50/60 border border-teal-200/60 hover:bg-teal-50'
                    )}
                  >
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                      {getIcon(n)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{n.titre}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{n.date}</span>
                        {n.lien && (
                          <span className="text-teal-700 font-semibold flex items-center gap-0.5">
                            Voir la demande <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};