import { randomUUID } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { executeRun } from '../engine/engine.js';
let timer: NodeJS.Timeout | undefined;
let busy=false, startedAt:Date|undefined, lastError:string|null=null;
const active=new Set<string>();
const concurrency=Math.max(1,Math.min(16,Number(process.env.QUEUE_CONCURRENCY)||3));
const leaseMs=60000;
async function recoverInterrupted(){
 // External effects cannot safely be replayed after an uncertain interruption.
 // Mark failed; explicit retry uses the original immutable snapshot.
 await prisma.$transaction(async tx=>{
  const stale=await tx.$queryRaw<Array<{id:string}>>`UPDATE "WorkflowRun" SET status='FAILED', error='Worker interrupted. Review external effects before retrying.', "finishedAt"=NOW(), "leaseOwner"=NULL, "leaseUntil"=NULL WHERE status='RUNNING' AND ("leaseUntil" < NOW() OR "leaseUntil" IS NULL) RETURNING id`;
  const ids=stale.map(r=>r.id);if(!ids.length)return;
  await tx.workflowStep.updateMany({where:{runId:{in:ids},status:'RUNNING'},data:{status:'FAILED',error:'Worker lease expired; effect may have completed',finishedAt:new Date()}});
 });
}
async function expireApprovals(){
 const steps=await prisma.workflowStep.findMany({where:{status:'WAITING',run:{status:'WAITING'}},select:{id:true,runId:true,output:true}});
 for(const step of steps){
  const deadline=(step.output as {deadline?:string}|null)?.deadline;
  if(!deadline||Date.parse(deadline)>Date.now())continue;
  await prisma.$transaction(async tx=>{
   const changed=await tx.workflowRun.updateMany({where:{id:step.runId,status:'WAITING',steps:{some:{id:step.id,status:'WAITING'}}},data:{status:'FAILED',error:'Approval timed out',finishedAt:new Date()}});
   if(changed.count){await tx.workflowStep.updateMany({where:{runId:step.runId,status:'WAITING'},data:{status:'FAILED',error:'Approval timed out',finishedAt:new Date()}});await tx.runLog.create({data:{runId:step.runId,level:'warn',message:'Approval deadline expired'}})}
  });
 }
}
async function launch(id:string,owner:string){
 const heartbeat=setInterval(()=>{void prisma.workflowRun.updateMany({where:{id,status:'RUNNING',leaseOwner:owner},data:{leaseUntil:new Date(Date.now()+leaseMs)}}).catch(()=>{lastError='Worker heartbeat failed'})},10000);
 try{await executeRun(id,owner)}catch{lastError='Worker execution failed'}finally{clearInterval(heartbeat);active.delete(id)}
}
export async function tickQueue(){
 if(busy)return;busy=true;
 try{
  await recoverInterrupted();await expireApprovals();
  for(let room=concurrency-active.size;room>0;room--){
   const owner=randomUUID();
   const rows=await prisma.$queryRaw<Array<{id:string}>>`
    UPDATE "WorkflowRun" SET status='RUNNING', "leaseOwner"=${owner}, "leaseUntil"=${new Date(Date.now()+leaseMs)}, "startedAt"=COALESCE("startedAt",NOW())
    WHERE id=(SELECT id FROM "WorkflowRun" WHERE status='QUEUED' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id`;
   if(!rows.length)break;
   active.add(rows[0].id);void launch(rows[0].id,owner);
  }
  lastError=null;
 }catch{lastError='Queue database operation failed'}finally{busy=false}
}
export async function startQueue(){if(timer)return;startedAt=new Date();await tickQueue();timer=setInterval(()=>void tickQueue(),1000);timer.unref()}
export function stopQueue(){if(timer)clearInterval(timer);timer=undefined}
export function queueStatus(){return{active:!!timer,startedAt:startedAt?.toISOString()||null,running:active.size,concurrency,leaseMs,lastError}}
