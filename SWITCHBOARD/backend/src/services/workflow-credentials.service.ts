import {prisma} from '../config/prisma.js';
import {AppError} from '../utils/AppError.js';
import type {WorkflowDefinition} from '../types/workflow.js';
const allowed:Record<string,string[]>={http:['API_KEY','BASIC_AUTH'],postgres:['POSTGRES'],ssh:['SSH'],powershell:['SSH'],email:['SMTP']};
export async function validateCredentials(def:WorkflowDefinition,workflowId?:string,user?:{role:string}){
 const refs=def.nodes.filter(n=>n.data.config?.credentialRef);
 const ids=refs.map(n=>String(n.data.config!.credentialRef));
 const rows=await prisma.credential.findMany({where:{id:{in:ids}},select:{id:true,type:true,allowedWorkflowIds:true}});
 const issues=refs.flatMap(node=>{const row=rows.find(r=>r.id===node.data.config!.credentialRef);return !row||!allowed[node.data.kind]?.includes(row.type)||(user?.role!=='ADMIN'&&(!workflowId||!row.allowedWorkflowIds.includes(workflowId)))?[{nodeId:node.id,field:'credentialRef',message:`${node.data.label}: credential is missing or incompatible`}]:[]});
 if(issues.length)throw new AppError(issues.map(i=>i.message).join(' · '),400,{issues});
}
