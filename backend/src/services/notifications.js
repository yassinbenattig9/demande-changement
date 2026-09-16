'use strict';

const { sql, getPool, insertRow, toDtoRows } = require('../db');
const { normEmail } = require('./shared');

/** Notification in-app (8 plus récentes non lues servies au frontend). */
async function addNotification(email, titre, lien) {
  try {
    const pool = await getPool();
    await insertRow('Notifications', {
      titre,
      date: new Date(),
      lien: lien || '',
      etat_lecture: '0',
      email_concerne: email,
    });
  } catch (e) {
    console.error('[services] notification ignorée :', e.message);
  }
}

async function listNotifications(email) {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('em', sql.NVarChar, normEmail(email))
    .query(
      `SELECT TOP 8 * FROM [Notifications]
        WHERE LOWER(LTRIM(RTRIM(email_concerne))) = @em AND etat_lecture = '0'
        ORDER BY ROWID DESC`
    );
  return toDtoRows('Notifications', res.recordset);
}

async function markNotificationRead(rowid) {
  const pool = await getPool();
  await pool.request().input('rid', sql.Int, rowid).query(`UPDATE [Notifications] SET etat_lecture = '1' WHERE ROWID = @rid`);
}

module.exports = { addNotification, listNotifications, markNotificationRead };