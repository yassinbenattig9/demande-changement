import React, { useState, useEffect } from 'react';
import { Mail, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, MailItem } from '../types';
import { formatDateFr } from '../lib/utils';

interface MailingRow {
  mail: MailItem;
  demande?: Demande;
}

const emptyForm = { numero_demande: 0, email: '', message: '', frequence: 'Semaine' };

export const MailingPage: React.FC = () => {
  const { success, error } = useToast();

  const [rows, setRows] = useState<MailingRow[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMailings = async () => {
    setIsLoading(true);
    try {
      const demandesList = await apiClient.getDemandes();
      setDemandes(demandesList);
      const mailings = await apiClient.getMailings();
      setRows(
        mailings.map((m) => ({ mail: m, demande: demandesList.find((d) => d.numero_demande === m.numero_demande) }))
      );
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger les mailings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMailings();
  }, []);

  const handleCreate = async () => {
    if (!form.numero_demande) {
      error('Demande requise', 'Sélectionnez une demande.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      error('Email requis', 'Renseignez une adresse valide.');
      return;
    }
    setIsSubmitting(true);
    try {
      const demande = demandes.find((d) => d.numero_demande === form.numero_demande)!;
      await apiClient.createMailing({
        numero_demande: form.numero_demande,
        email: form.email.trim(),
        message: form.message.trim() || 'Mise à jour Change Control',
        frequence: form.frequence,
        date_creation_mailing: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        reponse: 'non',
        numero_chronologique: demande.numero_chronologique,
        dernier_envoi: null,
        frequence_par_jour: '30',
        etat_demande: demande.etat_demande,
        reponse_service: '',
      });
      success('Mailing créé', "L'envoi périodique a été programmé.");
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadMailings();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de créer le mailing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReponse = async (row: MailingRow) => {
    try {
      await apiClient.updateMailing(row.mail.id_mail!, {
        reponse: row.mail.reponse === 'oui' ? 'non' : 'oui',
        dernier_envoi:
          row.mail.reponse === 'oui'
            ? null
            : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Mailing mis à jour', 'Réponse du destinataire enregistrée.');
      await loadMailings();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de mettre à jour le mailing.');
    }
  };

  const columns: Column<MailingRow>[] = [
    {
      header: 'Demande',
      accessor: (row) => <span className="font-mono text-xs font-bold text-teal-700">{row.mail.numero_chronologique}</span>,
      sortable: true,
      className: 'w-28',
    },
    {
      header: 'Destinataire',
      accessor: (row) => (
        <span className="text-xs text-slate-800 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" /> {row.mail.email}
        </span>
      ),
    },
    {
      header: 'Message',
      accessor: (row) => <p className="text-xs text-slate-700 line-clamp-2 min-w-[240px]">{row.mail.message}</p>,
    },
    {
      header: 'Fréquence',
      accessor: (row) => (
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {row.mail.frequence} ({row.mail.frequence_par_jour} j)
        </span>
      ),
    },
    {
      header: 'Dernier envoi',
      accessor: (row) => <span className="font-mono text-xs text-slate-700">{formatDateFr(row.mail.dernier_envoi)}</span>,
    },
    {
      header: 'Réponse',
      accessor: (row) => {
        const isOui = row.mail.reponse === 'oui';
        return (
          <Button
            variant={isOui ? 'success' : 'outline'}
            size="sm"
            onClick={() => handleToggleReponse(row)}
            leftIcon={isOui ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          >
            {isOui ? 'Répondu (oui)' : 'Non répondu'}
          </Button>
        );
      },
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mailing de suivi (relances automatiques)"
        subtitle="Programmation des envois périodiques de relance aux services impactés (DCMEDICIS.dbo.mailing)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Mailing' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {rows.length} mailing(s)
          </span>
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nouveau mailing
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(r) => `${r.mail.id_mail}`}
        searchableKey={(r) => `${r.mail.email} ${r.mail.numero_chronologique} ${r.mail.message}`}
        searchPlaceholder="Rechercher par destinataire, demande..."
        isLoading={isLoading}
        emptyTitle="Aucun mailing programmé pour le moment."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreate}
        title="Nouveau mailing de suivi"
        variant="primary"
        confirmLabel="Créer le mailing"
        isLoading={isSubmitting}
        description={
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Demande concernée <span className="text-rose-600">*</span>
              </label>
              <select
                value={form.numero_demande}
                onChange={(e) => setForm({ ...form, numero_demande: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value={0}>Sélectionner...</option>
                {demandes.map((d) => (
                  <option key={d.numero_demande} value={d.numero_demande}>
                    {d.numero_chronologique} — {d.sujet_changement}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Destinataire (email) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="destinataire@medicis.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fréquence</label>
                <select
                  value={form.frequence}
                  onChange={(e) => setForm({ ...form, frequence: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="Semaine">Hebdomadaire</option>
                  <option value="Jour">Quotidienne</option>
                  <option value="Mois">Mensuelle</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Message-type</label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Relance : merci de finaliser votre évaluation d'impact..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default MailingPage;