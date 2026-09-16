import React, { useState, useEffect } from 'react';
import { Server, Save } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';

export const ParametresPage: React.FC = () => {
  const { success, error } = useToast();

  const [serv, setServ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadServeur = async () => {
    setIsLoading(true);
    try {
      const params = await apiClient.getServeur();
      setServ(params.Serv || '');
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de charger la configuration serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServeur();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateServeur({ Serv: serv.trim() });
      success('Configuration enregistrée', 'L\'adresse du serveur DCMEDICIS a été mise à jour.');
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible d\'enregistrer la configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Paramètres de l'application"
        subtitle="Configuration système : connexion au serveur backend DCMEDICIS (table serveur)."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Paramètres' }]}
      />

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5">
        <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center gap-3">
          <Server className="w-5 h-5 text-teal-700 shrink-0" />
          <p className="text-xs text-teal-900 leading-relaxed">
            Cette adresse configure la connexion du client au SQL Server DCMEDICIS
            (table « serveur »).
          </p>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Adresse de base du serveur (Serv) <span className="text-rose-600">*</span>
              </label>
              <input
                value={serv}
                onChange={(e) => setServ(e.target.value)}
                placeholder="http://serveur-dcmedicis:8080"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Exemple : http://192.168.1.50/API-DCMEDICIS — aucune donnée sensible ne doit être saisie ici.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Enregistrer la configuration
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParametresPage;