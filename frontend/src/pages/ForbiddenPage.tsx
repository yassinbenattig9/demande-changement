import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>
        <div>
          <p className="text-6xl font-black font-mono text-slate-200 tracking-tight">403</p>
          <h1 className="text-lg font-bold text-slate-900 mt-1">Accès refusé</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Vos droits d'accès (DCMEDICIS.dbo.Utilisateurs.Accees) ne vous autorisent pas à consulter
            cette ressource. Contactez votre administrateur GxP si nécessaire.
          </p>
        </div>
        <Link to="/">
          <Button variant="primary" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
            Retour au tableau de bord
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage; 