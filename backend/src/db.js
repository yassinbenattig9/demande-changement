/**
 * Couche d'accès SQL Server (mssql/tedious) pour l'application Medicis Change Control.
 *
 * Le schéma DCMEDICIS est VOLONTAIREMENT INTACT (aucune migration).
 * Ce module :
 *  - maintient un pool de connexions (`mssql`)
 *  - découvre à la volée la colonne identité et les types de colonnes de chaque table
 *    (INFORMATION_SCHEMA), pour composer des requêtes sans supposer les noms de PK
 *    non documentés (Approbation, Service_impactees, Plan_actions, Reunion, mailing…)
 *  - convertit dates/datetimes en entrée et en sortie selon le type réel stocké
 *  - exécute UNIQUEMENT des requêtes paramétrées (antidote à l'injection SQL du code historique)
 */

'use strict';

const sql = require('mssql');
require('dotenv').config();

const dcConfig = {
  server: process.env.DB_DC_SERVER,
  database: process.env.DB_DC_DATABASE,
  user: process.env.DB_DC_USER,
  password: process.env.DB_DC_PASSWORD,
  port: undefined,
  pool: {
    max: parseInt(process.env.DB_DC_POOL_MAX || '10', 10),
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: String(process.env.DB_DC_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate:
      String(process.env.DB_DC_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true',
    enableArithAbort: true,
    requestTimeout: 120000,
  },
  connectionTimeout: parseInt(process.env.DB_DC_CONNECT_TIMEOUT || '15000', 10),
};

let poolPromise = null;

/** Retourne le pool de connexions (créé paresseusement). */
function getPool() {
  if (!poolPromise) {
    if (!dcConfig.server || !dcConfig.database) {
      throw new Error(
        'Configuration DCMEDICIS incomplète : renseignez DB_DC_SERVER / DB_DC_DATABASE dans backend/.env'
      );
    }
    poolPromise = sql.connect(dcConfig);
    poolPromise.catch(() => {
      poolPromise = null; // permet une reconnexion au prochain appel
    });
  }
  return poolPromise;
}

/* ------------------------------------------------------------------------ */
/*  Introspection légère du schéma (cache par processus)                     */
/* ------------------------------------------------------------------------ */

const tablesMeta = new Map();

/**
 * Retourne la liste des colonnes [ { name, dataType } ] d'une table.
 * dataType ∈ { 'varchar', 'nvarchar', 'text', 'ntext', 'int', 'bigint',
 *  'datetime', 'datetime2', 'date', 'smalldatetime', 'bit', 'decimal', ... }
 */
async function getColumns(table) {
  if (!tablesMeta.has(table)) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('T', sql.NVarChar, table)
      .query(
        `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @T
          ORDER BY ORDINAL_POSITION`
      );
    tablesMeta.set(table, result.recordset.map((c) => ({ name: c.name, dataType: c.dataType })));
  }
  return tablesMeta.get(table);
}

/** Colonne identité (PK auto-incrémentée) d'une table, le cas échéant. */
const identityCache = new Map();

async function getIdentityColumn(table) {
  if (!identityCache.has(table)) {
    const pool = await getPool();
    const res = await pool
      .request()
      .input('T', sql.NVarChar, table)
      .query(
        `SELECT c.name AS column_name
           FROM sys.tables t
           JOIN sys.identity_columns c ON c.object_id = t.object_id
          WHERE t.name = @T`
      );
    const identity = res.recordset[0] ? res.recordset[0].column_name : null;

    if (!identity) {
      const pkRes = await pool
        .request()
        .input('T', sql.NVarChar, table)
        .query(
          `SELECT TOP 1 kcu.COLUMN_NAME AS column_name
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND tc.TABLE_NAME = @T`
        );
      identityCache.set(table, pkRes.recordset[0] ? pkRes.recordset[0].column_name : null);
    } else {
      identityCache.set(table, identity);
    }
  }
  return identityCache.get(table);
}

/* ------------------------------------------------------------------------ */
/*  Conversion de valeurs                                                    */
/* ------------------------------------------------------------------------ */

const bq = (name) => `[${name}]`;

/** Type mssql (paramètre SOUTENU) correspondant à un type de colonne SQL Server. */
function paramType(dataType) {
  switch (dataType) {
    case 'int':
      return sql.Int;
    case 'bigint':
      return sql.BigInt;
    case 'smallint':
    case 'tinyint':
      return sql.SmallInt;
    case 'bit':
      return sql.Bit;
    case 'date':
      return sql.Date;
    case 'datetime':
    case 'datetime2':
    case 'smalldatetime':
      return sql.DateTime;
    case 'time':
      return sql.Time;
    case 'decimal':
    case 'numeric':
      return sql.Decimal(18, 4);
    case 'float':
    case 'real':
      return sql.Float;
    case 'text':
    case 'ntext':
      return sql.NVarChar(sql.MAX);
    default:
      // varchar / nvarchar / char / nchar
      return dataType.toLowerCase().includes('char') || dataType.toLowerCase().startsWith('n')
        ? sql.NVarChar(sql.MAX)
        : sql.NVarChar(sql.MAX);
  }
}

const DATE_STRING = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const ISO_STRING = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;

/** 'dd/MM/yyyy[ HH:mm[:ss]]' → Date locale (rend ISO au param mssql). */
function parseFrDate(value) {
  if (value == null || value === '') return null;
  const m = String(value).match(DATE_STRING);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
  }
  if (ISO_STRING.test(String(value))) return new Date(String(value).replace(' ', 'T'));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Conversion côté entrée (valeur du payload → valeur SQL). */
function toDbValue(value, dataType) {
  if (value == null) return null;
  if (['datetime', 'datetime2', 'smalldatetime', 'date'].includes(dataType)) {
    const d = value instanceof Date ? value : parseFrDate(value);
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (dataType === 'bit') {
    if (typeof value === 'boolean') return value ? 1 : 0;
    const v = String(value).trim().toLowerCase();
    return ['1', 'true', 'oui', 'yes', 'x'].includes(v) ? 1 : 0;
  }
  if (['int', 'bigint', 'smallint', 'tinyint'].includes(dataType)) {
    const n = Number(value);
    return Number.isNaN(n) ? null : Math.trunc(n);
  }
  return value;
}

/** Conversion côté sortie (recordset → DTO JSON). */
function toDtoValue(value, dataType) {
  if (value == null) return null;
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    if (dataType === 'date') return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
    const hms = value.getHours() + value.getMinutes() + value.getSeconds();
    return hms === 0
      ? `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`
      : `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  if (dataType === 'bit') return value === true || value === 1 || value === '1';
  return value;
}

/* ------------------------------------------------------------------------ */
/*  Helpers génériques INSERT / UPDATE / DELETE                              */
/* ------------------------------------------------------------------------ */

/**
 * INSERT paramétré dans `table`. `values` = object {colonne: valeur}.
 * Utilise uniquement les colonnes existantes de la table.
 * Retourne { idName, idValue } de la ligne insérée.
 */
async function insertRow(table, values) {
  const cols = await getColumns(table);
  const existing = cols
    .filter((c) => Object.prototype.hasOwnProperty.call(values, c.name))
    .map((c) => ({ ...c, sqlValue: toDbValue(values[c.name], c.dataType) }));

  if (existing.length === 0) throw new Error(`Aucune colonne à insérer dans ${table}`);

  const identity = await getIdentityColumn(table);
  const colList = existing.map((c) => bq(c.name)).join(', ');
  const paramList = existing.map((_, i) => `@p${i}`).join(', ');
  const req = (await getPool()).request();
  existing.forEach((c, i) => req.input(`p${i}`, paramType(c.dataType), c.sqlValue));

  // L'OUTPUT est utilisé dès qu'une colonne identité existe : il renvoie la
  // valeur auto-générée même si la colonne n'a pas été fournie explicitement.
  if (identity) {
    const out = await req.query(
      `INSERT INTO ${bq(table)} (${colList}) OUTPUT INSERTED.${bq(identity)} AS newId VALUES (${paramList})`
    );
    return { idName: identity, idValue: out.recordset[0] ? out.recordset[0].newId : null };
  }

  await req.query(`INSERT INTO ${bq(table)} (${colList}) VALUES (${paramList})`);
  return { idName: identity, idValue: null };
}

/** UPDATE paramétré : UPDATE [table] SET ... WHERE [idCol] = @id */
async function updateRow(table, idCol, idValue, patch) {
  const cols = await getColumns(table);
  const existing = cols
    .filter((c) => Object.prototype.hasOwnProperty.call(patch, c.name) && c.name !== idCol)
    .map((c) => ({ ...c, sqlValue: toDbValue(patch[c.name], c.dataType) }));

  if (existing.length === 0) return;

  const setList = existing.map((c, i) => `${bq(c.name)} = @s${i}`).join(', ');
  const req = (await getPool()).request();
  existing.forEach((c, i) => req.input(`s${i}`, paramType(c.dataType), c.sqlValue));
  req.input('pk', paramType('int'), idValue);

  await req.query(`UPDATE ${bq(table)} SET ${setList} WHERE ${bq(idCol)} = @pk`);
}

/** DELETE : DELETE FROM [table] WHERE [idCol] = @id */
async function deleteRow(table, idCol, idValue) {
  const req = (await getPool()).request();
  req.input('pk', paramType('int'), idValue);
  await req.query(`DELETE FROM ${bq(table)} WHERE ${bq(idCol)} = @pk`);
}

/** Exécute `fn(pool)` dans une transaction (commit/rollback automatique). */
async function withTransaction(fn) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (e) {
    try {
      await tx.rollback();
    } catch (_) {
      /* ignore */
    }
    throw e;
  }
}

/** Toute ligne du recordset, convertie en DTO JSON (dates & bits). */
async function toDtoRows(table, recordset) {
  const cols = await getColumns(table);
  const typeOf = Object.fromEntries(cols.map((c) => [c.name, c.dataType]));
  return recordset.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = toDtoValue(v, typeOf[k]);
    }
    return out;
  });
}

/** Une ligne (la première) du recordset convertie, ou null. */
async function toDtoFirst(table, recordset) {
  if (!recordset || recordset.length === 0) return null;
  return (await toDtoRows(table, recordset))[0];
}

module.exports = {
  sql,
  dcConfig,
  getPool,
  getColumns,
  getIdentityColumn,
  paramType,
  parseFrDate,
  toDbValue,
  toDtoValue,
  insertRow,
  updateRow,
  deleteRow,
  withTransaction,
  toDtoRows,
  toDtoFirst,
  bq,
};