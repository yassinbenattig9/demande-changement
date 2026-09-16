import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, ShieldCheck, Workflow, ListChecks, Users, FileSearch, MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

interface FagItem {
  q: string;
  a: string;
}

const FAQS: FagItem[] = [
  {
    q: 'Comment créer une demande de changement ?',
    a: "Dans l'onglet « Nouvelle demande », renseignez le formulaire en 4 étapes : informations générales, sujets/produits concernés, description, puis services impactés. Une fois enregistrée, la demande chemine dans le workflow d'approbation GxP.",
  },
  {
    q: 'Quel est le sens des états du workflow ?',
    a: 'La demande évolue : demande_éditée → acceptations (service, chargé, responsable) → approbation Directeur Qualité → comité PRT → impact défini → en cours → clôturée_validée. Une demande refusée ou incomplète revient vers le demandeur.',
  },
  {
    q: 'Comment répondre à un avis de service demandé ?',
    a: "Depuis « Évaluations des services » ou « Avis des services », les lignes qui vous incombent sont identifiées par un badge « M'incombe ». Cliquez sur « Répondre » et rédigez votre évaluation motivée, puis transmettez.",
  },
  {
    q: 'Comment diffuser un avis de changement validé ?',
    a: "Seules les demandes « clôturée_validée » figurent dans « Liste à diffuser ». Ajoutez les destinataires par email ; l'historique des envois est consultable depuis « Diffusions ».",
  },
  {
    q: 'Les données sont-elles réelles ?',
    a: "Oui : l'application est connectée via son API Node.js au schéma SQL Server DCMEDICIS (base de test), qui conserve la même structure que la version historique ASP.NET. Toute action est tracée dans l'audit trail.",
  },
  {
    q: 'Que signifie la matrice des droits Accees ?',
    a: "Une chaîne de 22 positions dans Utilisateurs.Accees encode vos permissions (création, approbations, plan d'action, sites, rôle spécial...). Elle est affichée et modifiable dans l'administration utilisateurs.",
  },
];

const GUIDES: { icon: React.ReactNode; title: string; description: string; to?: string }[] = [
  { icon: <Workflow className="w-5 h-5 text-teal-700" />, title: 'Créer et suivre une demande', description: 'Le parcours complet, de la création à la clôture.', to: '/demandes/nouvelle' },
  { icon: <Users className="w-5 h-5 text-teal-700" />, title: 'Valider en tant quapprobateur', description: 'Comprendre la file d\u2019approbation par rôle.', to: '/approbations' },
  { icon: <ListChecks className="w-5 h-5 text-teal-700" />, title: 'Plans d\u2019action', description: 'Suivi des actions correctives par demande.', to: '/plans-action' },
  { icon: <FileSearch className="w-5 h-5 text-teal-700" />, title: 'Retrouver une demande', description: 'Recherche multicritères du registre GxP.', to: '/demandes/recherche' },
  { icon: <ShieldCheck className="w-5 h-5 text-teal-700" />, title: 'Administration GxP', description: 'Utilisateurs, approbateurs, référentiels et mailing.', to: '/admin/utilisateurs' },
];

const POSITIONS: { pos: string; label: string }[] = [
  { pos: '0', label: 'Accès de base' },
  { pos: '1', label: 'Créer une demande' },
  { pos: '2-5', label: 'Approbations (service, chargé, responsable, PRT)' },
  { pos: '6', label: 'Consultation / Recherche' },
  { pos: '7', label: 'Plans d\u2019action' },
  { pos: '8', label: 'Évaluation / Clôture' },
  { pos: '9', label: 'Réunions' },
  { pos: '10-11', label: 'Mailing & Paramétrages' },
  { pos: '13-15', label: 'Utilisateurs, Avis services, Historique' },
  { pos: '16-21', label: 'Sites (chargé, responsable, plan action, clôture, PRT) et rôle spécial' },
];

export const AidePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'aide, guides & tutoriels"
        subtitle="Prise en main de l'application Change Control DCMEDICIS : workflow GxP, rôles, conseils."
        breadcrumbs={[{ label: 'Tableau de bord', href: '/' }, { label: 'Aide' }]}
        actions={
          <Link to="/demandes/recherche" className="text-xs text-teal-700 font-semibold hover:underline">
            Rechercher dans le registre →
          </Link>
        }
      />

      {/* Guide d'utilisation */}
      <div className="p-5 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-700/20">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold">Guide d'utilisation rapide</h2>
            <p className="text-[13px] text-teal-50 mt-1 leading-relaxed">
              Change Control centralise la traçabilité des modifications (procédés, équipements, documents,
              systèmes) conformément aux exigences 21 CFR Part 11. Chaque action est horodatée, signée et
              consignée dans le journal d'audit (Historique).
            </p>
          </div>
        </div>
      </div>

      {/* Cartes d'aide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {GUIDES.map((g) => (
          <div key={g.title} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              {g.icon}
            </div>
            <p className="text-xs font-bold text-slate-900">{g.title}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{g.description}</p>
            {g.to && (
              <Link to={g.to} className="inline-block text-[11px] font-semibold text-teal-700 hover:underline">
                Ouvrir →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <HelpCircle className="w-4 h-4 text-teal-600" />
          Questions fréquentes
        </div>
        <div className="divide-y divide-slate-100">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-semibold text-slate-800 group-open:text-teal-700">
                {f.q}
                <span className="text-slate-400 group-open:rotate-90 transition-transform">›</span>
              </summary>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Référence Accees */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <MapPin className="w-4 h-4 text-teal-600" />
          Référence des positions Accees (matrice des droits)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POSITIONS.map((p) => (
            <div key={p.pos} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-mono text-[11px] font-bold text-teal-800 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                {p.pos}
              </span>
              <span className="text-[11px] text-slate-600">{p.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          La matrice complète est consultable sur la page « Mon profil » et éditable dans l'administration
          utilisateurs.
        </p>
      </div>
    </div>
  );
};

export default AidePage;