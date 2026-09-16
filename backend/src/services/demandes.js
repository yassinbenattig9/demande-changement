'use strict';

const { sql, getPool, insertRow, toDtoRows, toDtoFirst } = require('../db');
const { ensureWorkflowRow } = require('../workflow');
const { normEmail, todayFr } = require('./shared');
const { addHistorique } = require('./history');

/** Calcule le prochain numero_chronologique 'YY/NNN' (max de l'année + 1). */
async function nextChronologique(pool) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const res = await pool
    .request()
    .input('yy', sql.NVarChar, `${yy}/%`)
    .query(
      `SELECT TOP 1 numero_chronologique FROM [Demande]
        WHERE numero_chronologique LIKE @yy
        ORDER BY numero_chronologique DESC`
    );
  const last = res.recordset[0] ? String(res.recordset[0].numero_chronologique) : '';
  const m = last.match(/^\d{2}\/(\d{3})$/);
  const next = m ? Number(m[1]) + 1 : 1;
  return `${yy}/${String(next).padStart(3, '0')}`;
}

const DEMANDE_SELECT = `
  SELECT d.*,
         LOWER(LTRIM(RTRIM(u.email))) AS lower_demandeur,
         ISNULL(NULLIF(LTRIM(RTRIM(u.NomPrenom)), ''), LOWER(LTRIM(RTRIM(d.demandeur)))) AS nom_demandeur
    FROM [Demande] d
    LEFT JOIN [Utilisateurs] u ON LOWER(LTRIM(RTRIM(u.email))) = LOWER(LTRIM(RTRIM(d.demandeur)))`;

/** Liste des demandes avec filtres. */
async function listDemandes(filters = {}) {
  const pool = await getPool();
  const where = [];
  const req = pool.request();
  if (filters.search) {
    const q = `%${filters.search}%`;
    req.input('q', sql.NVarChar, q);
    where.push(`(d.numero_chronologique LIKE @q OR d.designation LIKE @q OR d.sujet_changement LIKE @q OR d.demandeur LIKE @q)`);
  }
  if (filters.statut) {
    req.input('st', sql.NVarChar, `%${String(filters.statut).trim()}%`);
    where.push(`LTRIM(RTRIM(d.etat_demande)) LIKE @st`);
  }
  if (filters.service) {
    req.input('sv', sql.NVarChar, `%${filters.service}%`);
    where.push(`d.service_demandeur LIKE @sv`);
  }
  if (filters.type) {
    req.input('tp', sql.NVarChar, filters.type);
    where.push(`d.type_changement = @tp`);
  }
  if (filters.site) {
    req.input('si', sql.NVarChar, `%${filters.site}%`);
    where.push(`d.site LIKE @si`);
  }
  if (filters.classement) {
    req.input('cl', sql.NVarChar, filters.classement);
    where.push(`d.classement_changement = @cl`);
  }
  const res = await req.query(
    `${DEMANDE_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY d.numero_demande DESC`
  );
  return toDtoRows('Demande', res.recordset);
}

/** Détail d'une demande (répare la ligne workflow si absente). */
async function getDemandeById(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.Int, numero)
    .query(`${DEMANDE_SELECT} WHERE d.numero_demande = @nd`);
  if (res.recordset.length === 0) return null;
  await ensureWorkflowRow(pool, numero);
  return toDtoFirst('Demande', res.recordset);
}

/**
 * Création d'une demande : chronologique, ligne workflow (etape_validation),
 * services impactés initiaux et historique.
 */
async function createDemande(data) {
  const pool = await getPool();
  const chrono = await nextChronologique(pool);

  const demandeData = {
    demandeur: normEmail(data.demandeur || ''),
    etat_demande: 'demande_éditée',
    sujet_changement: data.sujet_changement || '',
    date_souhaite_mep_changement: data.date_souhaite_mep_changement || '',
    service_demandeur: data.service_demandeur || '',
    date_edition: todayFr(),
    type_changement: data.type_changement || '',
    site: data.site || '',
    designation: data.designation || '',
    etat_actuel: data.etat_actuel || '',
    description_changement: data.description_changement || '',
    classement_changement: data.classement_changement || '',
    impact_produit_bailleur_licenece: data.impact_produit_bailleur_licenece || '',
    produit_bailleur_licence_impactees: data.produit_bailleur_licence_impactees || '',
    avantages_attendu: data.avantages_attendu || '',
    numero_chronologique: chrono,
    Action_Qualipro: data.Action_Qualipro || null,
    cloturer: '0',
    date_reception: data.date_reception || null,
    codes: data.codes || '',
    nbr_reponse_services: 0,
    ressource_necessaire: data.ressource_necessaire || '',
  };

  const inserted = await insertRow('Demande', demandeData);
  const numero = inserted.idValue;

  // Ligne de workflow (étape de validation initiale — comportement historique).
  await ensureWorkflowRow(pool, numero);

  // Population initiale des services impactés (joignons les fonctions approbateurs).
  try {
    await seedServicesImpactes(pool, numero);
  } catch (e) {
    console.error('[services] seed services impactés ignoré :', e.message);
  }

  await addHistorique(normEmail(data.demandeur || 'Système'), 'création', `Création demande ${chrono}`, chrono);

  return getDemandeById(numero);
}

/** Services impactés initiaux (fonctions approbateurs de Approb_Fonction). */
async function seedServicesImpactes(pool, numero) {
  const res = await pool.request().query(
    `SELECT DISTINCT u.service, u.email, u.fonction, ISNULL(NULLIF(LTRIM(RTRIM(u.NomPrenom)),''), LTRIM(RTRIM(u.prenom))) AS Intervenant
       FROM [Approb_Fonction] af
       JOIN [Utilisateurs] u ON u.fonction = af.Nom_Fonction
      WHERE af.Type LIKE '%Approbateur%'
        AND LTRIM(RTRIM(ISNULL(u.service,''))) <> ''
        AND LTRIM(RTRIM(ISNULL(u.email,''))) <> ''`
  );
  for (const r of res.recordset) {
    await insertRow('Service_impactees', {
      numero_demande: String(numero),
      service: r.service,
      email_cancernee: normEmail(r.email),
      fonction: r.fonction || '',
      reponse: '',
      date_reponse: null,
      commentaire: '',
      Intervenant: r.Intervenant || '',
    });
  }
}

module.exports = { nextChronologique, listDemandes, getDemandeById, createDemande, seedServicesImpactes };