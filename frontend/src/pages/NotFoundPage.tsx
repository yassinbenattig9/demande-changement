import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-teal-700" />
        </div>
        <div>
          <p className="text-6xl font-black font-mono text-slate-200 tracking-tight">404</p>
          <h1 className="text-lg font-bold text-slate-900 mt-1">Page introuvable</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            La ressource demandée n'existe pas dans l'application Change Control DCMEDICIS.
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

export default NotFoundPage;