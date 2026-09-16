import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastContext';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { success, error } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isValidToken = Boolean(token && token.length >= 12);

  const handleSubmit = async () => {
    if (!isValidToken) {
      error('Lien invalide', 'Ce lien de réinitialisation est expiré ou invalide.');
      return;
    }
    if (password.length < 8) {
      error('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      error('Confirmation erronée', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setIsSubmitting(true);
    // Phase UI uniquement : l'API backend (mssql) appliquera le hachage côté serveur.
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    setDone(true);
    success('Mot de passe réinitialisé', 'Vous pouvez vous reconnecter avec votre nouveau mot de passe.');
  };

  const inputCls =
    'w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-teal-700" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-4">Réinitialisation du mot de passe</h1>
            <p className="text-xs text-slate-500 mt-1">Change Control • DCMEDICIS</p>
          </div>

          {!isValidToken ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
              <p className="font-semibold">Lien de réinitialisation invalide ou expiré.</p>
              <p className="text-rose-700">
                Le jeton transmis n'est pas reconnaissable. Demandez un nouveau lien depuis la page
                « Mot de passe oublié ».
              </p>
              <Link to="/forgot-password" className="inline-block text-teal-700 font-semibold hover:underline">
                Redemander un lien →
              </Link>
            </div>
          ) : done ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Mot de passe mis à jour
              </p>
              <p>Votre nouveau mot de passe sera pris en compte au backend lors de l'implémentation serveur.</p>
              <Link to="/login" className="inline-block mt-1 text-teal-700 font-semibold hover:underline">
                Accéder à la connexion
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe (8+ caractères)"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
                className={inputCls}
              />
              <Button variant="primary" className="w-full" onClick={handleSubmit} isLoading={isSubmitting}>
                Enregistrer le nouveau mot de passe
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-teal-900">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                Conformité GxP : le mot de passe n'est jamais anonymisé ni exposé côté client.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;