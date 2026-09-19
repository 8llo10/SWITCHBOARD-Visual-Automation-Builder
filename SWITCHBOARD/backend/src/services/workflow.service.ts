import {validateCredentials} from './workflow-credentials.service.js';
import {workflowDefinitionSchema} from '../validators/workflow.validator.js';
import{prisma}from'../config/prisma.js';
export const list=(user:{id:string;role:string})=>prisma.workflow.findMany({where:user.role==='ADMIN'?{}:{ownerId:user.id},orderBy:{updatedAt:'desc'}});
export const find=(id:string)=>prisma.workflow.findUniqueOrThrow({where:{id}});
export const canAccess=(w:{ownerId:string|null},u:{id:string;role:string})=>u.role==='ADMIN'||w.ownerId===u.id;
export const create=(input:any,ownerId:string)=>prisma.workflow.create({data:{...input,ownerId}});
export const update=(id:string,input:any)=>prisma.workflow.update({where:{id},data:{...input,version:{increment:1}}});
export const remove=(id:string)=>prisma.workflow.delete({where:{id}});
export const runs=(workflowId:string)=>prisma.workflowRun.findMany({where:{workflowId},orderBy:{createdAt:'desc'},take:50});
export async function run(workflowId:string,triggerType:string,payload:any){const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:workflowId},select:{version:true,definition:true,owner:{select:{role:true}}}});const definition=workflowDefinitionSchema.parse(workflow.definition);await validateCredentials(definition,workflowId,workflow.owner||undefined);return prisma.workflowRun.create({data:{workflowId,status:'QUEUED',triggerType,triggerPayload:payload||{},context:{workflowVersion:workflow.version,definitionSnapshot:workflow.definition,runtime:null} as any}})}
