import {spawnSync} from 'node:child_process';
const run=(args)=>spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{stdio:'inherit'}).status??1;
if(!process.env.DIRECT_URL)throw new Error('DIRECT_URL is required; use a direct database connection');
// This reads the actual schema, then compares it with the historical baseline.
// A nonempty diff or a connection error always prevents marking the baseline.
const result=run(['migrate','diff','--from-schema-datasource','prisma/baseline.prisma','--to-schema-datamodel','prisma/baseline.prisma','--exit-code']);
if(result!==0){console.error('Baseline not established: resolve schema differences without deleting production data.');process.exit(result||1)}
if(process.argv.includes('--apply')){
 if(process.env.BASELINE_BACKUP_CONFIRMED!=='yes')throw new Error('Confirm a restorable production backup with BASELINE_BACKUP_CONFIRMED=yes first');
 process.exit(run(['migrate','resolve','--applied','20260918000000_baseline']));
}
console.log('Historical Prisma schema matches. No migration history or data was modified.');
