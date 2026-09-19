import type{Request,Response}from'express';import{prisma}from'../config/prisma.js';import{schedulerStatus}from'../services/scheduler.service.js';import{queueStatus}from'../services/queue.service.js';
export function live(_req:Request,res:Response){return res.json({ok:true,service:'switchboard-api',version:'2.1.0',uptime:Math.round(process.uptime()),timestamp:new Date().toISOString(),scheduler:schedulerStatus(),queue:queueStatus()})}
export async function ready(_req:Request,res:Response){try{await prisma.$queryRaw`SELECT 1`;const queued=await prisma.workflowRun.count({where:{status:'QUEUED'}});const running=await prisma.workflowRun.count({where:{status:'RUNNING'}});return res.json({ok:true,database:'connected',scheduler:schedulerStatus(),queue:{...queueStatus(),queued,running},timestamp:new Date().toISOString()})}catch{return res.status(503).json({ok:false,database:'unavailable',scheduler:schedulerStatus(),queue:queueStatus(),timestamp:new Date().toISOString()})}}
export async function metrics(_req:Request,res:Response){
 const since=new Date(Date.now()-24*60*60*1000);
 const [counts,duration,queued,running]=await Promise.all([
  prisma.workflowRun.groupBy({by:['status'],where:{createdAt:{gte:since}},_count:{_all:true}}),
  prisma.$queryRaw<Array<{average:number|null}>>`SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt"))*1000)::float8 AS average FROM "WorkflowRun" WHERE "createdAt">=${since} AND "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL`,
  prisma.workflowRun.count({where:{status:'QUEUED'}}),prisma.workflowRun.count({where:{status:'RUNNING'}})
 ]);
 const total=counts.reduce((sum,row)=>sum+row._count._all,0),failed=counts.find(row=>row.status==='FAILED')?._count._all||0,succeeded=counts.find(row=>row.status==='SUCCEEDED')?._count._all||0;
 return res.json({window:'24h',runs:total,succeeded,failed,queued,running,failureRate:total?Math.round(failed/total*10000)/100:0,averageDurationMs:Math.round(duration[0]?.average||0),uptime:Math.round(process.uptime()),queue:queueStatus(),scheduler:schedulerStatus(),timestamp:new Date().toISOString()});
}
