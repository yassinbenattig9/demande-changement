'use strict';

const { sql, getPool } = require('../db');

const STATUTS_PENDING = [
  'demande_éditée',
  'demande_editee',
  'acceptation_Hiérarchique',
  'acceptation_hiérarchique',
  'acceptation_coordinateur_changement',
  'acceptation_responsable_service',
  'acceptation_chargé_changement',
  'acceptation_charge_changement',
  'acceptation_responsable_changement',
  'acceptation_directeur_qualite',
  'acceptation_directeur_qualité',
  'acceptation_4_services',
  'approbation_directeur_qualité',
  'approbation_prt',
  'aprobar',
];
const STATUTS_CLOTUREES = ['clôturée_validée', 'cloturée_validee', 'cloturée_validée', 'cloturée_valide'];
const STATUTS_EN_COURS = ['Demande de changement Impact défini', 'Demande de changement en cours', 'Impact défini', 'Implémentation en cours', 'plan_action'];

const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

function keyMois(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function labelMois(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function parseFr(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getDashboardStats() {
  const pool = await getPool();
  const res = await pool.request().query(
    `SELECT numero_demande, LTRIM(RTRIM(ISNULL(etat_demande,''))) AS etat,
            date_edition, date_souhaite_mep_changement, date_cloture, date_clôture
       FROM [Demande]`
  );
  const rows = res.recordset;

  const totalDemandes = rows.length;
  let enAttenteApprobation = 0;
  let enCoursExecution = 0;
  let clotureesValidees = 0;
  let enRetardCount = 0;
  let sommeDelaiJours = 0;
  let delaiCount = 0;

  const repartition = new Map();
  const months = new Map();
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.set(keyMois(d), { key: keyMois(d), mois: labelMois(d), soumises: 0, validees: 0 });
  }

  for (const r of rows) {
    const etat = String(r.etat || '').trim();
    const low = etat.toLowerCase();

    repartition.set(etat, (repartition.get(etat) || 0) + 1);

    if (STATUTS_PENDING.some((s) => low.includes(s.toLowerCase()))) enAttenteApprobation += 1;
    if (STATUTS_CLOTUREES.some((s) => low.includes(s.toLowerCase()))) clotureesValidees += 1;
    if (STATUTS_EN_COURS.some((s) => low.includes(s.toLowerCase()))) enCoursExecution += 1;

    // Retard : date souhaitée dépassée, demande ni clôturée ni refusée ni incomplète.
    const delay = parseFr(r.date_souhaite_mep_changement);
    const closed = STATUTS_CLOTUREES.some((s) => low.includes(s.toLowerCase())) || low.includes('refus') || low.includes('incompl');
    if (delay && delay < now && !closed) enRetardCount += 1;

    // Délai moyen : clôture - édition.
    const edition = parseFr(r.date_edition);
    const closure = parseFr(r.date_cloture || r.date_clôture);
    if (edition && closure && closed) {
      const days = Math.round((closure - edition) / 86400000);
      if (days >= 0) {
        sommeDelaiJours += days;
        delaiCount += 1;
      }
    }

    // Évolution mensuelle sur date_edition + clôtures.
    if (edition) {
      const m = keyMois(edition);
      if (months.has(m)) months.get(m).soumises += 1;
    }
    if (closure) {
      const m = keyMois(closure);
      if (months.has(m)) months.get(m).validees += 1;
    }
  }

  const repartitionParStatut = [...repartition.entries()].map(([name, count], i) => ({
    name,
    count,
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    totalDemandes,
    enAttenteApprobation,
    enCoursExecution,
    clotureesValidees,
    enRetardCount,
    tauxRespectDelaiPct: delaiCount
      ? Math.round((1 - enRetardCount / Math.max(totalDemandes, 1)) * 100)
      : null,
    délaiMoyenJours: delaiCount ? Math.round(sommeDelaiJours / delaiCount) : 0,
    repartitionParStatut,
    evolutionMensuelle: [...months.values()].reverse(),
  };
}

module.exports = { getDashboardStats };