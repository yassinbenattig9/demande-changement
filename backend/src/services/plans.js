'use strict';

const { sql, getPool, insertRow, updateRow, toDtoRows, toDtoFirst } = require('../db');
const { todayFr } = require('./shared');

async function listPlans(numero) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('nd', sql.Int, numero)
    .query(`SELECT * FROM [Plan_actions] WHERE numero_demande = @nd ORDER BY rowid ASC`);
  return toDtoRows('Plan_actions', res.recordset);
}

async function createPlan(plan) {
  const pool = await getPool();
  await insertRow('Plan_actions', {
    numero_demande: Number(plan.numero_demande),
    Actions: plan.action_description || plan.Actions || '',
    commentaire: plan.commentaire || '',
    date_creation: todayFr(),
    email_utilisateur: plan.responsable || plan.email_utilisateur || '',
    action_chronologique: plan.action_qualipro || plan.action_chronologique || null,
  });
  const res = await pool
    .request()
    .input('nd', sql.Int, Number(plan.numero_demande))
    .query(`SELECT TOP 1 * FROM [Plan_actions] WHERE numero_demande = @nd ORDER BY rowid DESC`);
  return toDtoFirst('Plan_actions', res.recordset);
}

async function updatePlan(id, patch) {
  const pool = await getPool();
  const values = {};
  if (patch.action_description !== undefined) values.Actions = patch.action_description;
  if (patch.responsable !== undefined) values.email_utilisateur = patch.responsable;
  if (patch.action_qualipro !== undefined) values.action_chronologique = patch.action_qualipro;
  if (patch.commentaire !== undefined) values.commentaire = patch.commentaire;
  if (Object.keys(values).length > 0) await updateRow('Plan_actions', 'rowid', id, values);
  const res = await pool.request().input('rid', sql.Int, id).query(`SELECT * FROM [Plan_actions] WHERE rowid = @rid`);
  return toDtoFirst('Plan_actions', res.recordset);
}

module.exports = { listPlans, createPlan, updatePlan };