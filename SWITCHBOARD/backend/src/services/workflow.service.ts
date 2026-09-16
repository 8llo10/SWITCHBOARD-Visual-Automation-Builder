import{prisma}from'../config/prisma.js';import{executeRun}from'../engine/engine.js';
export const list=(user:{id:string;role:string})=>prisma.workflow.findMany({where:user.role==='ADMIN'?{}:{ownerId:user.id},orderBy:{updatedAt:'desc'}});
export const find=(id:string)=>prisma.workflow.findUniqueOrThrow({where:{id}});
export const canAccess=(w:{ownerId:string|null},u:{id:string;role:string})=>u.role==='ADMIN'||w.ownerId===u.id;
export const create=(input:any,ownerId:string)=>prisma.workflow.create({data:{...input,ownerId}});
export const update=(id:string,input:any)=>prisma.workflow.update({where:{id},data:{...input,version:{increment:1}}});
export const remove=(id:string)=>prisma.workflow.delete({where:{id}});
export const runs=(workflowId:string)=>prisma.workflowRun.findMany({where:{workflowId},orderBy:{createdAt:'desc'},take:50});
export async function run(workflowId:string,triggerType:string,payload:any){const r=await prisma.workflowRun.create({data:{workflowId,triggerType,triggerPayload:payload||{}}});void executeRun(r.id);return r}
