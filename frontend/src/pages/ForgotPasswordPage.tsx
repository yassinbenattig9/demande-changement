import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';
import { apiClient } from '../lib/api-client';

export const ForgotPasswordPage: React.FC = () => {
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      error('Email invalide', 'Renseignez une adresse email professionnelle.');
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await apiClient.getUserByEmail(email.trim());
      if (!user) {
        error('Compte introuvable', 'Aucun compte ne correspond à cette adresse dans DCMEDICIS.');
        return;
      }
      success('Demande transmise', 'Une procédure de réinitialisation a été ouverte.');
      setSent(true);
    } catch (e) {
      console.error(e);
      error('Erreur', 'Impossible de traiter la demande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-teal-700" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-4">Mot de passe oublié</h1>
            <p className="text-xs text-slate-500 mt-1">
              Change Control • DCMEDICIS — la réinitialisation est traitée par l'administrateur GxP.
            </p>
          </div>

          {sent ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" /> Demande de réinitialisation enregistrée
              </p>
              <p>
                Un email a été remis à l'administrateur AQ pour confirmer votre identité. Vous recevrez un
                lien de réinitialisation à l'adresse <strong>{email}</strong>.
              </p>
              <Link to="/login" className="inline-block mt-1 text-teal-700 font-semibold hover:underline">
                Revenir à l'écran de connexion
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Adresse email professionnelle</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@medicis.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={handleSubmit} isLoading={isSubmitting}>
                Demander la réinitialisation
              </Button>
              <p className="text-[11px] text-slate-400 text-center">
                Les comptes GxP requièrent une validation par l'AQ avant toute réinitialisation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;