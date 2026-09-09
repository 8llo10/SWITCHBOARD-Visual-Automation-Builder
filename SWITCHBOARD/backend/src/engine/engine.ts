import { prisma } from '../config/prisma.js';
import { log } from '../services/log.service.js';
import { executeNode } from './executors/index.js';
import type { EngineContext,WorkflowDefinition,WorkflowEdge } from '../types/workflow.js';
function outgoing(edges:WorkflowEdge[],nodeId:string){return edges.filter(e=>e.source===nodeId)}
function roots(def:WorkflowDefinition){const targets=new Set(def.edges.map(e=>e.target));return def.nodes.filter(n=>!targets.has(n.id))}
function nextEdges(edges:WorkflowEdge[],nodeId:string,route?:string|boolean){const out=outgoing(edges,nodeId);if(route===undefined)return out;if(out.some(e=>e.data?.when!==undefined))return out.filter(e=>String(e.data?.when)===String(route));return out}
export async function executeRun(runId:string,resumeFromNodeId?:string){
 const run=await prisma.workflowRun.findUniqueOrThrow({where:{id:runId},include:{workflow:true,steps:true}});const def=run.workflow.definition as unknown as WorkflowDefinition;
 const context:EngineContext=resumeFromNodeId?(run.context as unknown as EngineContext):{trigger:run.triggerPayload as any,vars:{},outputs:{}};
 await prisma.workflowRun.update({where:{id:runId},data:{status:'RUNNING',startedAt:run.startedAt||new Date(),error:null}});await log(runId,resumeFromNodeId?'Workflow execution resumed':'Workflow execution started');
 const queue=resumeFromNodeId?outgoing(def.edges,resumeFromNodeId).map(e=>e.target):roots(def).map(n=>n.id);const visited=new Set(run.steps.filter(s=>s.status==='SUCCEEDED').map(s=>s.nodeId));
 try{
  while(queue.length){const nodeId=queue.shift()!;if(visited.has(nodeId))continue;const node=def.nodes.find(n=>n.id===nodeId);if(!node)continue;visited.add(nodeId);
   const retry=Math.max(0,Math.min(Number(node.data.retry||0),5));let result:any;let lastErr:any;
   const previousAttempts=run.steps.filter(s=>s.nodeId===nodeId).length;
   for(let i=1;i<=retry+1;i++){const attempt=previousAttempts+i;const step=await prisma.workflowStep.create({data:{runId,nodeId,nodeType:String(node.data.kind),label:node.data.label,status:'RUNNING',attempt,input:context as any,startedAt:new Date()}});await log(runId,`▶ ${node.data.label}`,nodeId);
    try{result=await executeNode(node,context);await prisma.workflowStep.update({where:{id:step.id},data:{status:result.wait?'WAITING':'SUCCEEDED',output:result.output as any,finishedAt:result.wait?null:new Date()}});await log(runId,result.wait?`⏸ ${node.data.label} waiting for approval`:`✓ ${node.data.label} completed`,nodeId,result.wait?'warn':'info');lastErr=null;break}catch(err:any){lastErr=err;await prisma.workflowStep.update({where:{id:step.id},data:{status:'FAILED',error:err.message,finishedAt:new Date()}});await log(runId,`✕ ${node.data.label}: ${err.message}`,nodeId,'error');if(i<=retry)await log(runId,`Retrying ${node.data.label} (${i}/${retry})`,nodeId,'warn')}
   }
   if(lastErr&&!node.data.continueOnFailure)throw lastErr;if(lastErr)continue;context.outputs[nodeId]=result?.output;context.vars.last=result?.output;
   if(result?.wait){await prisma.workflowRun.update({where:{id:runId},data:{status:'WAITING',context:context as any}});return}
   for(const e of nextEdges(def.edges,nodeId,result?.route))queue.push(e.target);
  }
  await prisma.workflowRun.update({where:{id:runId},data:{status:'SUCCEEDED',finishedAt:new Date(),context:context as any}});await log(runId,'Workflow completed successfully');
 }catch(err:any){await prisma.workflowRun.update({where:{id:runId},data:{status:'FAILED',error:err.message,finishedAt:new Date(),context:context as any}});await log(runId,`Workflow failed: ${err.message}`,undefined,'error');}
}
