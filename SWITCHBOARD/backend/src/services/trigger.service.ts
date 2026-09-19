import {AppError} from '../utils/AppError.js';
import {resolveTriggerConfig} from './trigger-config.js';
import{randomBytes}from'node:crypto';import{prisma}from'../config/prisma.js';
export async function assertWorkflowAccess(workflowId:string,user:{id:string;role:string}){const w=await prisma.workflow.findUniqueOrThrow({where:{id:workflowId},select:{id:true,ownerId:true}});if(user.role!=='ADMIN'&&w.ownerId!==user.id)throw new AppError('Forbidden',403);return w}
export const list=(workflowId:string)=>prisma.trigger.findMany({where:{workflowId},select:{id:true,type:true,enabled:true,config:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'asc'}});
export const create=async(workflowId:string,d:{type:string;enabled:boolean;config:Record<string,any>})=>prisma.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM "Workflow" WHERE id=${workflowId} FOR UPDATE`;
 const workflow=await tx.workflow.findUniqueOrThrow({where:{id:workflowId}});
 const config=resolveTriggerConfig(workflow.definition,d.type,d.config);
 const existing=await tx.trigger.findMany({where:{workflowId,type:d.type}});
 if(existing.some(t=>(t.config as Record<string,unknown>).nodeId===config.nodeId))throw new AppError('This node already has a trigger. Update its configuration.',409);
 return tx.trigger.create({data:{workflowId,type:d.type,enabled:d.enabled,config,secret:d.type==='WEBHOOK'?randomBytes(24).toString('hex'):null}});
});
export const update=async(id:string,d:{type?:string;enabled?:boolean;config?:Record<string,any>})=>{
 const current=await prisma.trigger.findUniqueOrThrow({where:{id},include:{workflow:true}});
 if(d.type&&d.type!==current.type)throw new AppError('Trigger type cannot be changed; create a new trigger node',400);
 const config=resolveTriggerConfig(current.workflow.definition,current.type,d.config||(current.config as Record<string,unknown>));
 return prisma.trigger.update({where:{id},data:{enabled:d.enabled,config}});
};
export const remove=(id:string)=>prisma.trigger.delete({where:{id}});export async function rotateSecret(id:string){return prisma.trigger.update({where:{id},data:{secret:randomBytes(24).toString('hex')}})}
export async function workflowIdForTrigger(id:string){return(await prisma.trigger.findUniqueOrThrow({where:{id},select:{workflowId:true}})).workflowId}

export async function status(id:string){
 const trigger=await prisma.trigger.findUniqueOrThrow({where:{id},include:{workflow:{select:{status:true}}}});
 const lastRun=await prisma.workflowRun.findFirst({where:{workflowId:trigger.workflowId,triggerType:`${trigger.type.toLowerCase()}:${id}`},orderBy:{createdAt:'desc'},select:{id:true,status:true,createdAt:true}});
 const c=trigger.config as Record<string,unknown>,factor=c.unit==='days'?86400000:c.unit==='hours'?3600000:60000;
 const nextAt=trigger.type==='SCHEDULE'&&trigger.enabled&&trigger.workflow.status==='ACTIVE'?new Date(Math.max(Date.now(),(lastRun?.createdAt.getTime()||Date.now())+Math.max(Number(c.every||5)*factor,60000))).toISOString():null;
 return {lastRun,nextAt};
}
