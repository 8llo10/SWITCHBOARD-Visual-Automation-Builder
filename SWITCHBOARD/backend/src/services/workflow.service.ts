import {validateCredentials} from './workflow-credentials.service.js';
import {resolveTriggerConfig} from './trigger-config.js';
import {workflowDefinitionSchema} from '../validators/workflow.validator.js';
import{prisma}from'../config/prisma.js';
export const list=(user:{id:string;role:string})=>prisma.workflow.findMany({where:user.role==='ADMIN'?{}:{OR:[{ownerId:user.id},{permittedUserIds:{has:user.id}}]},orderBy:{updatedAt:'desc'}});
export const find=(id:string)=>prisma.workflow.findUniqueOrThrow({where:{id}});
export const canAccess=(w:{ownerId:string|null;permittedUserIds?:string[]},u:{id:string;role:string})=>u.role==='ADMIN'||w.ownerId===u.id||!!w.permittedUserIds?.includes(u.id);
export const canEdit=(w:{ownerId:string|null},u:{id:string;role:string})=>u.role==='ADMIN'||(u.role==='OPERATOR'&&w.ownerId===u.id);
export const create=(input:any,ownerId:string)=>prisma.workflow.create({data:{...input,ownerId}});
export const update=(id:string,input:any)=>prisma.$transaction(async tx=>{
 const workflow=await tx.workflow.update({where:{id},data:{...input,version:{increment:1}}});
 if(input.definition){
  const triggers=await tx.trigger.findMany({where:{workflowId:id}});
  for(const trigger of triggers){
   try{
    const old=trigger.config as Record<string,unknown>;
    const node=input.definition.nodes.find((n:{id:string})=>n.id===old.nodeId);
    const config=resolveTriggerConfig(input.definition,trigger.type,{...old,...node?.data.config});
    await tx.trigger.update({where:{id:trigger.id},data:{config}});
   }catch{await tx.trigger.update({where:{id:trigger.id},data:{enabled:false}})}
  }
 }
 return workflow;
});
export const remove=(id:string)=>prisma.workflow.delete({where:{id}});
export const runs=(workflowId:string)=>prisma.workflowRun.findMany({where:{workflowId},orderBy:{createdAt:'desc'},take:50});
export async function run(workflowId:string,_triggerType:string,payload:any){const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:workflowId},select:{version:true,definition:true,owner:{select:{role:true}}}});const definition=workflowDefinitionSchema.parse(workflow.definition);await validateCredentials(definition,workflowId,workflow.owner||undefined);const entry=definition.nodes.find(n=>n.data.kind==='trigger')||definition.nodes.find(n=>['webhook','schedule'].includes(n.data.kind));return prisma.workflowRun.create({data:{workflowId,status:'QUEUED',triggerType:'manual',triggerPayload:payload||{},context:{workflowVersion:workflow.version,definitionSnapshot:workflow.definition,entryNodeId:entry!.id,runtime:null} as any}})}
