import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle, Database } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Champs requis', 'Veuillez renseigner votre adresse e-mail professionnelle.');
      return;
    }
    setIsLoading(true);
    try {
      const ok = await login(email, password);
      setIsLoading(false);
      if (!ok) {
        error('Échec de connexion', 'Identifiants invalides ou compte désactivé.');
        return;
      }
      success('Connexion réussie', 'Session sécurisée initialisée selon les normes 21 CFR Part 11.');
      navigate('/');
    } catch {
      setIsLoading(false);
      error('Erreur de connexion', 'Impossible de joindre le serveur backend.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Panneau gauche : Identité visuelle & Conformité GxP */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-50 border-r border-slate-200">
        {/* Glows d'arrière-plan */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo & Titre */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-800 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-teal-900/10 border border-teal-700">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">MÉDICIS</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  GxP
                </span>
              </div>
              <p className="text-xs text-slate-500">Industrie Pharmaceutique • Change Control</p>
            </div>
          </div>

          <div className="mt-14 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-teal-200 text-teal-800 text-xs font-medium mb-4 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Système informatisé validé GAMP 5</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Gestion centralisée des demandes de changement.
            </h1>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Plateforme unifiée d'instruction, d'approbation séquentielle et de suivi d'impact
              pour l'ensemble des sites de production, laboratoires de contrôle et affaires
              réglementaires Medicis.
            </p>
          </div>
        </div>

        {/* Piliers de conformité */}
        <div className="my-10 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-600" /> 21 CFR Part 11
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Signatures électroniques infalsifiables et piste d'audit horodatée immuable.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-600" /> ALCOA+ Principles
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Intégrité, traçabilité et authenticité des données garanties à chaque étape.
            </p>
          </div>
        </div>

        {/* Footer info base de données */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
          <span className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-teal-600" /> Schéma SQL Server DCMEDICIS
          </span>
          <span>Version 2.4.0 • GxP Validated</span>
        </div>
      </div>

      {/* Panneau droit : Formulaire d'authentification */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Authentification Sécurisée</h2>
            <p className="text-xs text-slate-500 mt-1">
              Accédez à votre espace de travail avec vos identifiants Medicis Pharma.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Adresse e-mail professionnelle
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@medicis-pharma.com"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Mot de passe</label>
                <Link to="/forgot-password" className="text-[11px] text-teal-700 font-medium hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Se connecter
              </Button>
            </div>
          </form>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center leading-relaxed">
            Connexion soumise à la charte informatique Medicis. Toutes les actions sont tracées dans l'audit trail DCMEDICIS conformément aux réglementations GxP.
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;