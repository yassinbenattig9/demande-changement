import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Mail, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';
import { Demande, Diffusion } from '../types';
import { formatDateFr } from '../lib/utils';

export const DiffusionDemandePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [demande, setDemande] = useState<Demande | null>(null);
  const [diffusions, setDiffusions] = useState<Diffusion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [email, setEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const d = await apiClient.getDemandeById(Number(id));
      if (!d) {
        setNotFound(true);
        return;
      }
      setDemande(d);
      setDiffusions(await apiClient.getDiffusionsByDemande(Number(id)));
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la demande.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAdd = async () => {
    if (!email.trim() || !email.includes('@')) {
      error('Email requis', 'Renseignez une adresse email valide.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createDiffusion({
        Num_Dem: Number(id),
        Email: email.trim(),
        Date_Diffusion: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
      success('Diffusion ajoutée', 'Le destinataire a été ajouté à la liste de diffusion.');
      setEmail('');
      setIsModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'ajouter le destinataire.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Diffusion>[] = [
    {
      header: 'Destinataire',
      accessor: (row) => (
        <span className="text-xs text-slate-800 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" /> {row.Email}
        </span>
      ),
    },
    {
      header: 'Diffusé le',
      accessor: (row) => <span className="font-mono text-xs text-slate-700">{formatDateFr(row.Date_Diffusion, true)}</span>,
      sortable: true,
    },
  ];

  if (notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Demande introuvable"
          subtitle={`Aucune demande ne correspond à #${id}.`}
          breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Diffusions', href: '/diffusion' }, { label: 'Liste par demande' }]}
        />
        <Button variant="outline" size="sm" onClick={() => navigate('/diffusion')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Retour aux diffusions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          demande ? (
            <span className="flex items-center gap-3">
              <Link to={`/demandes/${demande.numero_demande}`} className="font-mono text-teal-700 hover:underline">
                {demande.numero_chronologique}
              </Link>
              <span className="text-sm font-medium text-slate-500 line-clamp-1">{demande.sujet_changement}</span>
            </span>
          ) : (
            `Demande #${id}`
          )
        }
        subtitle="Liste des destinataires de l'avis de changement diffusé pour cette demande (DCMEDICIS.dbo.Diffusions)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Diffusions', href: '/diffusion' }, { label: 'Par demande' }]}
        badge={
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            {diffusions.length} destinataire(s)
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/diffusion')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Registre
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Ajouter un destinataire
            </Button>
          </div>
        }
      />

      <DataTable
        data={diffusions}
        columns={columns}
        keyExtractor={(r) => `${r.id_diffusion}`}
        searchableKey={(r) => r.Email}
        searchPlaceholder="Rechercher un destinataire..."
        isLoading={isLoading}
        emptyTitle="Aucun destinataire enregistré pour cette demande. Diffusez l'avis pour la première fois."
      />

      <ConfirmDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAdd}
        title={`Ajout d'un destinataire — ${demande?.numero_chronologique ?? ''}`}
        variant="primary"
        confirmLabel="Ajouter"
        isLoading={isSubmitting}
        description={
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Adresse email <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="destinataire@medicis.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        }
      />
    </div>
  );
};
export default DiffusionDemandePage;