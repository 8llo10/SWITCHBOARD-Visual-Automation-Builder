import{randomBytes}from'node:crypto';import{prisma}from'../config/prisma.js';
export const list=(workflowId:string)=>prisma.trigger.findMany({where:{workflowId},select:{id:true,type:true,enabled:true,config:true,secret:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'asc'}});
export const create=(workflowId:string,d:{type:string;enabled:boolean;config:Record<string,any>})=>prisma.trigger.create({data:{workflowId,type:d.type,enabled:d.enabled,config:d.config,secret:d.type==='WEBHOOK'?randomBytes(24).toString('hex'):null}});
export const update=(id:string,d:{type?:string;enabled?:boolean;config?:Record<string,any>})=>prisma.trigger.update({where:{id},data:d});
export const remove=(id:string)=>prisma.trigger.delete({where:{id}});
export async function rotateSecret(id:string){return prisma.trigger.update({where:{id},data:{secret:randomBytes(24).toString('hex')}})}
