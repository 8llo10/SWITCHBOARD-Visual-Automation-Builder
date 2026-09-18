import { prisma } from '../config/prisma.js';
import { log } from '../services/log.service.js';
import { executeNode } from './executors/index.js';
import type { EngineContext,WorkflowDefinition,WorkflowEdge,WorkflowNode } from '../types/workflow.js';
function outgoing(edges:WorkflowEdge[],nodeId:string){return edges.filter(e=>e.source===nodeId)}
function roots(def:WorkflowDefinition){const targets=new Set(def.edges.map(e=>e.target));return def.nodes.filter(n=>!targets.has(n.id))}
function nextEdges(edges:WorkflowEdge[],nodeId:string,route?:string|boolean){const out=outgoing(edges,nodeId);if(route===undefined)return out;if(out.some(e=>e.data?.when!==undefined))return out.filter(e=>String(e.data?.when)===String(route));return out}
function hasJoins(def:WorkflowDefinition){const counts=new Map<string,number>();for(const e of def.edges)counts.set(e.target,(counts.get(e.target)||0)+1);return [...counts.values()].some(n=>n>1)}
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
   await prisma.workflowStep.update({where:{id:step.id},data:{status:result.wait?'WAITING':'SUCCEEDED',output:result.output as any,finishedAt:result.wait?null:new Date()}});await log(runId,result.wait?`⏸ ${node.data.label} waiting for approval`:`✓ ${node.data.label} completed`,node.id,result.wait?'warn':'info');lastErr=null;break
  }catch(err:any){
   if(await cancelled(runId))return{node,error:new Error('Cancelled')};
   lastErr=err;await prisma.workflowStep.update({where:{id:step.id},data:{status:'FAILED',error:err.message,finishedAt:new Date()}});await log(runId,`✕ ${node.data.label}: ${err.message}`,node.id,'error');if(i<=retry)await log(runId,`Retrying ${node.data.label} (${i}/${retry})`,node.id,'warn')
  }
 }
 if(lastErr)return{node,error:lastErr};return{node,result,wait:!!result?.wait}
}

export async function executeRun(runId:string,resumeFromNodeId?:string){
 const run=await prisma.workflowRun.findUniqueOrThrow({where:{id:runId},include:{workflow:true,steps:true}});
 const stored=run.context as any;const def=(stored?.definitionSnapshot||run.workflow.definition) as unknown as WorkflowDefinition;
 const context:EngineContext=resumeFromNodeId?((stored?.runtime||stored) as EngineContext):{trigger:run.triggerPayload as any,vars:{},outputs:{}};
 const envelope=()=>({workflowVersion:stored?.workflowVersion??run.workflow.version,definitionSnapshot:def,runtime:context});
 if(await cancelled(runId))return;
 await prisma.workflowRun.update({where:{id:runId},data:{status:'RUNNING',startedAt:run.startedAt||new Date(),error:null,context:envelope() as any}});await log(runId,resumeFromNodeId?'Workflow execution resumed':'Workflow execution started');
 const queue=resumeFromNodeId?outgoing(def.edges,resumeFromNodeId).map(e=>e.target):roots(def).map(n=>n.id);const visited=new Set(run.steps.filter(s=>s.status==='SUCCEEDED').map(s=>s.nodeId));
 const parallelSafe=!hasJoins(def);if(parallelSafe&&queue.length>1)await log(runId,`Parallel execution enabled for ${queue.length} independent branches`);
 try{
  while(queue.length){
   if(await cancelled(runId)){await log(runId,'Workflow execution stopped after cancellation',undefined,'warn');return}
   const candidates=parallelSafe&&!queue.some(id=>def.nodes.find(n=>n.id===id)?.data.kind==='approval')?queue.splice(0,queue.length):[queue.shift()!];
   const wave=[...new Set(candidates)].filter(id=>!visited.has(id)).map(id=>def.nodes.find(n=>n.id===id)).filter(Boolean) as WorkflowNode[];if(!wave.length)continue;for(const n of wave)visited.add(n.id);
   const settled=await Promise.all(wave.map(node=>executeOne(runId,node,context)));
   if(await cancelled(runId))return;
   let waiting=false;
   for(const item of settled){
    if(item.error){if(item.error.message==='Cancelled')return;if(!item.node.data.continueOnFailure)throw item.error;continue}
    context.outputs[item.node.id]=item.result?.output;context.vars.last=item.result?.output;
    if(item.wait){waiting=true;continue}
    for(const e of nextEdges(def.edges,item.node.id,item.result?.route))queue.push(e.target)
   }
   await prisma.workflowRun.update({where:{id:runId},data:{context:envelope() as any}});
   if(waiting){await prisma.workflowRun.update({where:{id:runId},data:{status:'WAITING',context:envelope() as any}});return}
  }
  if(await cancelled(runId))return;
  await prisma.workflowRun.update({where:{id:runId},data:{status:'SUCCEEDED',finishedAt:new Date(),context:envelope() as any}});await log(runId,'Workflow completed successfully');
 }catch(err:any){if(await cancelled(runId))return;await prisma.workflowRun.update({where:{id:runId},data:{status:'FAILED',error:err.message,finishedAt:new Date(),context:envelope() as any}});await log(runId,`Workflow failed: ${err.message}`,undefined,'error')}
}
