import {validateCredentials} from '../services/workflow-credentials.service.js';
import {readyNodes,type Outcome} from './graph.js';
import { prisma } from '../config/prisma.js';
import { log } from '../services/log.service.js';
import { executeNode } from './executors/index.js';
import type { EngineContext,WorkflowDefinition,WorkflowNode } from '../types/workflow.js';
async function cancelled(runId:string){const row=await prisma.workflowRun.findUnique({where:{id:runId},select:{status:true}});return row?.status==='CANCELLED'}

type NodeResult={node:WorkflowNode;result?:any;error?:Error;wait?:boolean};
async function executeOne(runId:string,node:WorkflowNode,context:EngineContext):Promise<NodeResult>{
 const retry=Math.max(0,Math.min(Number(node.data.retry||0),5));let result:any;let lastErr:any;
 const previousAttempts=await prisma.workflowStep.count({where:{runId,nodeId:node.id}});
 for(let i=1;i<=retry+1;i++){
  if(await cancelled(runId))return{node,error:new Error('Cancelled')};
  const attempt=previousAttempts+i;const step=await prisma.workflowStep.create({data:{runId,nodeId:node.id,nodeType:String(node.data.kind),label:node.data.label,status:'RUNNING',attempt,input:context as any,startedAt:new Date()}});await log(runId,`▶ ${node.data.label}`,node.id);
  try{
   result=await executeNode(node,context);
   if(await cancelled(runId)){await prisma.workflowStep.update({where:{id:step.id},data:{status:'SKIPPED',finishedAt:new Date(),error:'Cancelled during execution'}}).catch(()=>{});return{node,error:new Error('Cancelled')}}
   await prisma.workflowStep.updateMany({where:{id:step.id,status:'RUNNING',run:{status:'RUNNING'}},data:{status:result.wait?'WAITING':'SUCCEEDED',output:result.output as any,finishedAt:result.wait?null:new Date()}});await log(runId,result.wait?`⏸ ${node.data.label} waiting for approval`:`✓ ${node.data.label} completed`,node.id,result.wait?'warn':'info');lastErr=null;break
  }catch(err:any){
   if(await cancelled(runId))return{node,error:new Error('Cancelled')};
   lastErr=err;await prisma.workflowStep.updateMany({where:{id:step.id,status:'RUNNING',run:{status:'RUNNING'}},data:{status:'FAILED',error:err.message,finishedAt:new Date()}});await log(runId,`✕ ${node.data.label}: ${err.message}`,node.id,'error');if(i<=retry)await log(runId,`Retrying ${node.data.label} (${i}/${retry})`,node.id,'warn')
  }
 }
 if(lastErr)return{node,error:lastErr};return{node,result,wait:!!result?.wait}
}

export async function executeRun(runId:string, leaseOwner:string){
 const run=await prisma.workflowRun.findUniqueOrThrow({where:{id:runId},include:{workflow:true,steps:true}});
 if(run.status!=='RUNNING'||run.leaseOwner!==leaseOwner)return;
 const stored=run.context as any;
 const def=(stored?.definitionSnapshot||run.workflow.definition) as WorkflowDefinition;
 const context:EngineContext=stored?.runtime||{trigger:run.triggerPayload as any,vars:{},outputs:{}};
 const outcomes:Record<string,Outcome>=stored?.outcomes||{};
 if(!stored?.outcomes){
  const kind=run.triggerType.includes('webhook:')?'webhook':run.triggerType.includes('schedule:')?'schedule':'trigger';
  for(const node of def.nodes)if(['trigger','webhook','schedule'].includes(node.data.kind)&&(stored?.entryNodeId?node.id!==stored.entryNodeId:node.data.kind!==kind))outcomes[node.id]={status:'SKIPPED'};
 }

 for(const step of run.steps)if(step.status==='SUCCEEDED'&&outcomes[step.nodeId]?.status==='WAITING'){
   outcomes[step.nodeId]={status:'SUCCEEDED'};context.outputs[step.nodeId]=step.output;
 }
 const envelope=()=>({workflowVersion:stored?.workflowVersion??run.workflow.version,definitionSnapshot:def,entryNodeId:stored?.entryNodeId||null,runtime:context,outcomes});
 const persist=async(data:any)=>prisma.workflowRun.updateMany({where:{id:runId,status:'RUNNING',leaseOwner},data:{...data,context:envelope() as any}});
 try{
  const owner=run.workflow.ownerId?await prisma.user.findUnique({where:{id:run.workflow.ownerId},select:{role:true,active:true}}):null;
  if(!owner?.active)throw new Error('Workflow owner is unavailable');
  await validateCredentials(def,run.workflowId,owner);
  if(!stored?.outcomes){for(const [nodeId,outcome] of Object.entries(outcomes))if(outcome.status==='SKIPPED'){const node=def.nodes.find(n=>n.id===nodeId)!;await prisma.workflowStep.create({data:{runId,nodeId,nodeType:String(node.data.kind),label:node.data.label,status:'SKIPPED',finishedAt:new Date()}})}}
  await log(runId,'Workflow execution started');
  while(true){
   const owner=await prisma.workflowRun.findFirst({where:{id:runId,status:'RUNNING',leaseOwner,leaseUntil:{gt:new Date()}},select:{id:true}});
   if(!owner)return;
   const {ready,skipped}=readyNodes(def,outcomes);
   for(const id of skipped){outcomes[id]={status:'SKIPPED'};const node=def.nodes.find(n=>n.id===id)!;await prisma.workflowStep.create({data:{runId,nodeId:id,nodeType:String(node.data.kind),label:node.data.label,status:'SKIPPED',finishedAt:new Date()}})}
   if(skipped.length){await persist({});continue}
   if(!ready.length){
    const waiting=Object.values(outcomes).some(o=>o.status==='WAITING');
    if(!waiting&&Object.keys(outcomes).length!==def.nodes.length)throw new Error('Graph has unresolved dependencies');
    await persist({status:waiting?'WAITING':'SUCCEEDED',finishedAt:waiting?null:new Date(),leaseOwner:null,leaseUntil:null});return;
   }
   const results=await Promise.all(ready.map(id=>executeOne(runId,def.nodes.find(n=>n.id===id)!,structuredClone(context))));
   let failure:Error|undefined;
   for(const item of results){
    if(item.error){
     if(item.error.message==='Cancelled')return;
     outcomes[item.node.id]={status:'FAILED'};
     context.outputs[item.node.id]={error:'Node execution failed'};
     if(!item.node.data.continueOnFailure)failure=item.error;
    }else{
     if(['createUser','disableUser','addGroup','removeGroup','assignLicense','revokeLicense'].includes(item.node.data.kind))await prisma.auditEvent.create({data:{actorId:run.workflow.ownerId,action:`directory.${item.node.data.kind}`,entity:'DirectoryUser',entityId:item.result?.output?.id,metadata:{runId,nodeId:item.node.id}}});
     context.outputs[item.node.id]=item.result?.output??null;
     context.vars.last=item.result?.output??null;
     outcomes[item.node.id]={status:item.wait?'WAITING':'SUCCEEDED',...(item.result?.route!==undefined?{route:item.result.route}:{})};
    }
   }
   if(!(await persist({})).count)return;
   if(failure)throw failure;
  }
 }catch(error){
  const message=error instanceof Error?error.message:'Execution failed';
  const updated=await persist({status:'FAILED',error:message,finishedAt:new Date(),leaseOwner:null,leaseUntil:null});
  if(updated.count)await log(runId,'Workflow failed',undefined,'error');
 }
}
