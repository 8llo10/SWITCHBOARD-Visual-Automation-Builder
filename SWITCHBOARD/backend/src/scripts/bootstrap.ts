import {spawnSync} from 'node:child_process';
import {normalizeDatabaseEnv} from '../utils/databaseUrl.js';

/** Run existing Prisma schema bootstrap before starting the API.
 * DIRECT_URL is optional when DATABASE_URL points to a direct database endpoint.
 */
normalizeDatabaseEnv();
if(!process.env.DATABASE_URL){console.error('DATABASE_URL is required');process.exit(1)}
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
console.log('Checking database schema before API startup…');
const result=spawnSync('npx',['--no-install','prisma','db','push','--skip-generate'],{env:process.env,stdio:'inherit',shell:process.platform==='win32'});
if(result.error||result.status!==0){
 console.error('Database initialization failed. Check DATABASE_URL / DIRECT_URL and database connectivity.');
 process.exit(1);
}
await import('../server.js');
