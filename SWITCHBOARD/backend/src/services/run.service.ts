import{prisma}from'../config/prisma.js';import{log}from'./log.service.js';
export const get=(id:string)=>prisma.workflowRun.findUniqueOrThrow({where:{id},include:{workflow:{select:{id:true,name:true,slug:true,version:true,ownerId:true,permittedUserIds:true}},steps:{orderBy:{createdAt:'asc'}},logs:{orderBy:{createdAt:'asc'}}}});
export const list=(user:{id:string;role:string},workflowId?:string,status?:any,limit=50,cursor?:string)=>prisma.workflowRun.findMany({where:{...(user.role==='ADMIN'?{}:{workflow:{OR:[{ownerId:user.id},{permittedUserIds:{has:user.id}}]}}),...(workflowId?{workflowId}:{}),...(status?{status}:{})},orderBy:{createdAt:'desc'},take:Math.min(Math.max(limit,1),100),...(cursor?{cursor:{id:cursor},skip:1}:{}),include:{workflow:{select:{id:true,name:true,slug:true}},_count:{select:{steps:true,logs:true}}}});
export async function approve(id:string,approvedBy:string,isAdmin=false){
 return prisma.$transaction(async tx=>{
  const claimed=await tx.workflowRun.updateMany({where:{id,status:'WAITING'},data:{status:'WAITING'}});
  if(!claimed.count)return null;
  const steps=await tx.workflowStep.findMany({where:{runId:id,status:'WAITING'}});
  const eligible=steps.filter(step=>{const assigned=(step.output as any)?.approverEmail;return isAdmin||!assigned||String(assigned).toLowerCase()===approvedBy.toLowerCase()});
  if(!eligible.length)return null;
  for(const step of eligible)await tx.workflowStep.update({where:{id:step.id},data:{status:'SUCCEEDED',output:{approved:true,approvedBy,approvedAt:new Date().toISOString()},finishedAt:new Date()}});
  const status='QUEUED';await tx.workflowRun.update({where:{id},data:{status}});
  return {runId:id,status};
 });
}
export async function reject(id:string,rejectedBy:string,reason?:string,isAdmin=false){
 return prisma.$transaction(async tx=>{
  const locked=await tx.workflowRun.updateMany({where:{id,status:'WAITING'},data:{status:'WAITING'}});if(!locked.count)return null;
  const steps=await tx.workflowStep.findMany({where:{runId:id,status:'WAITING'}});
  if(!steps.some(step=>{const assigned=(step.output as any)?.approverEmail;return isAdmin||!assigned||String(assigned).toLowerCase()===rejectedBy.toLowerCase()}))return null;
  const changed=await tx.workflowRun.updateMany({where:{id,status:'WAITING'},data:{status:'FAILED',error:reason||'Approval rejected',finishedAt:new Date()}});
  if(!changed.count)return null;
  await tx.workflowStep.updateMany({where:{runId:id,status:'WAITING'},data:{status:'FAILED',error:reason||'Approval rejected',output:{approved:false,rejectedBy},finishedAt:new Date()}});
  return {runId:id,status:'FAILED' as const};
 });
}
export async function cancel(id:string,cancelledBy:string){
 return prisma.$transaction(async tx=>{
  const changed=await tx.workflowRun.updateMany({where:{id,status:{in:['QUEUED','RUNNING','WAITING']}},data:{status:'CANCELLED',finishedAt:new Date(),error:null,leaseOwner:null,leaseUntil:null}});
  if(!changed.count)return null;
  await tx.workflowStep.updateMany({where:{runId:id,status:{in:['PENDING','RUNNING','WAITING']}},data:{status:'SKIPPED',finishedAt:new Date()}});
  await tx.runLog.create({data:{runId:id,message:`Run cancelled by ${cancelledBy}`,level:'warn'}});
  return {runId:id,status:'CANCELLED' as const};
 });
}
export async function retry(id:string){const old=await prisma.workflowRun.findUniqueOrThrow({where:{id},include:{workflow:true}});if(!['FAILED','CANCELLED'].includes(old.status))return null;const previous=old.context as any;const snapshot=previous?.definitionSnapshot||old.workflow.definition;const version=previous?.workflowVersion??old.workflow.version;const run=await prisma.workflowRun.create({data:{workflowId:old.workflowId,status:'QUEUED',triggerType:`retry:${old.triggerType}`,triggerPayload:old.triggerPayload as any,context:{workflowVersion:version,definitionSnapshot:snapshot,entryNodeId:previous?.entryNodeId||null,runtime:null} as any}});return{runId:run.id,status:'QUEUED' as const,retryOf:id}}
