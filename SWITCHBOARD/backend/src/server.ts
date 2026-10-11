import {app} from './app.js';
import {env} from './config/env.js';
import {prisma} from './config/prisma.js';
import {startScheduler,stopScheduler} from './services/scheduler.service.js';
import {startQueue,stopQueue} from './services/queue.service.js';
import {ensureAuthSchema} from './services/schema.service.js';
import {beginStartupAttempt,markReady,markUnavailable,markStopping} from './services/startup-state.js';

let closing=false;
let retryTimer:NodeJS.Timeout|undefined;

async function initializeDatabase(){
 if(closing)return;
 beginStartupAttempt();
 try{
  await prisma.$queryRaw`SELECT 1`;
  await ensureAuthSchema();
  await startQueue();
  if(closing)return;
  startScheduler();
  markReady();
  console.log('SWITCHBOARD database and authentication ready');
 }catch(error:unknown){
  markUnavailable();
  const reason=error&&typeof error==='object'&&'code' in error?String(error.code):error instanceof Error?error.name:'UnknownError';
  console.error('SWITCHBOARD initialization failed ('+reason+'). Retrying after 15 seconds.');
  if(!closing)retryTimer=setTimeout(()=>void initializeDatabase(),15000);
  retryTimer?.unref();
 }
}

// Open the HTTP port before accessing PostgreSQL so Render health checks can run
// even when the database cannot yet be reached.
const server=app.listen(env.PORT,'0.0.0.0',()=>{
 console.log(`SWITCHBOARD API listening on :${env.PORT}`);
 void initializeDatabase();
});

async function shutdown(signal:string){
 if(closing)return;
 closing=true;
 markStopping();
 console.log(`${signal} received; shutting down`);
 if(retryTimer)clearTimeout(retryTimer);
 stopScheduler();
 stopQueue();
 server.close(async()=>{await prisma.$disconnect();process.exit(0)});
 setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGINT',()=>void shutdown('SIGINT'));
process.on('SIGTERM',()=>void shutdown('SIGTERM'));
process.on('unhandledRejection',reason=>console.error('Unhandled rejection',reason instanceof Error?reason.name:'UnknownError'));
process.on('uncaughtException',error=>{console.error('Uncaught exception',error.name);void shutdown('uncaughtException')});
