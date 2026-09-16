'use strict';

const { sql, getPool, getColumns } = require('../db');

function numero_categorie(ext) {
  const mime = String(ext || '').toLowerCase();
  if (mime.includes('.pdf')) return "Rapport d'impact";
  if (mime.includes('sheet') || mime.includes('word') || mime.includes('ppt')) return 'Schéma technique';
  return 'Autre';
}

async function getServeur() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT TOP 1 Serv FROM [serveur]`);
  return { Serv: res.recordset[0] ? res.recordset[0].Serv : '' };
}

async function updateServeur(patch) {
  const pool = await getPool();
  const serv = patch.Serv !== undefined ? String(patch.Serv) : '';
  await pool.request().input('serv', sql.NVarChar, serv).query(`UPDATE [serveur] SET Serv = @serv`);
  return getServeur();
}

async function listPiecesJointes() {
  const pool = await getPool();
  let table = 'Piece_jointes';
  try {
    const cols = await getColumns(table);
    if (!cols.some((c) => c.name === 'fichier')) table = null;
  } catch {
    table = null;
  }
  if (!table) return [];
  const res = await pool
    .request()
    .query(`SELECT rowid, numero_demande, utilisateur, type_fichier, fichier, etat_demande, nom_fichier, email_uploader FROM [Piece_jointes] ORDER BY rowid DESC`);
  return res.recordset.map((r) => {
    const buf = r.fichier;
    return {
      nom_fichier: r.nom_fichier || r.type_fichier || 'fichier',
      taille_octets: buf && Buffer.isBuffer(buf) ? buf.length : 0,
      id: String(r.rowid),
      date_upload: '',
      televerse_par: r.email_uploader || r.utilisateur || '',
      type_mime: r.type_fichier || '',
      categorie: numero_categorie(r.type_fichier),
    };
  });
}

module.exports = { getServeur, updateServeur, listPiecesJointes };