const { getDashboardStats } = require('../services/stats');
(async () => {
  const s = await getDashboardStats();
  console.log(JSON.stringify({totalDemandes:s.totalDemandes, enAttenteApprobation:s.enAttenteApprobation, enCoursExecution:s.enCoursExecution, clotureesValidees:s.clotureesValidees, enRetardCount:s.enRetardCount}, null, 2));
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
