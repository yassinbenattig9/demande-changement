require('dotenv').config({ path: __dirname + '/../.env' });
const { getPool } = require('../db');
(async () => {
  const pool = await getPool();
  // exact duplicates
  const ex = await pool.request().query("SELECT code, COUNT(*) c FROM [Tab_Divers] WHERE parametre='produit' AND ISNULL(code,'') <> '' GROUP BY code HAVING COUNT(*) > 1 ORDER BY c DESC");
  console.log('EXACT dups:', JSON.stringify(ex.recordset.map(r=>({code:r.code, c:r.c}))));
  // tri + lower dups
  const tr = await pool.request().query("SELECT LTRIM(RTRIM(LOWER(code))) AS k, COUNT(*) c FROM [Tab_Divers] WHERE parametre='produit' AND ISNULL(code,'') <> '' GROUP BY LTRIM(RTRIM(LOWER(code))) HAVING COUNT(*) > 1 ORDER BY c DESC");
  console.log('TRIM+LOWER dups:', JSON.stringify(tr.recordset.map(r=>({k:r.k, c:r.c}))));
})().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
