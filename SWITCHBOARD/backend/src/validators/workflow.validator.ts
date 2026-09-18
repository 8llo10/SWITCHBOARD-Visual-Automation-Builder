import{z}from'zod';

const supportedKinds=new Set(['trigger','createUser','disableUser','addGroup','assignLicense','condition','email','http','postgres','webhook','ssh','powershell','health','delay','approval','noop']);
const nodeSchema=z.object({
 id:z.string().min(1),
 type:z.string().min(1),
 position:z.object({x:z.number(),y:z.number()}),
 data:z.record(z.any()).default({})
});
const edgeSchema=z.object({
 id:z.string().min(1),
 source:z.string().min(1),
 target:z.string().min(1),
 sourceHandle:z.string().optional(),
 data:z.object({when:z.union([z.string(),z.boolean()]).optional()}).passthrough().optional()
});

export const workflowDefinitionSchema=z.object({nodes:z.array(nodeSchema).min(1),edges:z.array(edgeSchema)}).superRefine((def,ctx)=>{
 const ids=new Set<string>();
 for(const[n,node]of def.nodes.entries()){
  if(ids.has(node.id))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'id'],message:`Duplicate node id: ${node.id}`});
  ids.add(node.id);
  const kind=String(node.data?.kind||'');
  if(!supportedKinds.has(kind))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','kind'],message:`Unsupported node kind: ${kind||'(missing)'}`});
  if(!String(node.data?.label||'').trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','label'],message:'Node label is required'});
  const c=node.data?.config||{};
  if(kind==='health'&&!c.url)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config','url'],message:'Health Check requires a URL'});
  if(kind==='http'&&!c.url)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config','url'],message:'HTTP Request requires a URL'});
  if(kind==='postgres'&&(!c.connectionString&&!c.credentialRef||!c.query))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config'],message:'PostgreSQL requires a connection/credential and query'});
  if((kind==='ssh'||kind==='powershell')&&((!c.host||!c.username)&&!c.credentialRef||!c.command))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config'],message:`${kind} requires connection details/credential and command`});
 }
 const edgeIds=new Set<string>();
 for(const[i,e]of def.edges.entries()){
  if(edgeIds.has(e.id))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'id'],message:`Duplicate edge id: ${e.id}`});
  edgeIds.add(e.id);
  if(!ids.has(e.source))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'source'],message:`Unknown source node: ${e.source}`});
  if(!ids.has(e.target))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'target'],message:`Unknown target node: ${e.target}`});
  if(e.source===e.target)ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i],message:'Self-connections are not allowed'});
 }
 const adj=new Map<string,string[]>();for(const id of ids)adj.set(id,[]);for(const e of def.edges)if(ids.has(e.source)&&ids.has(e.target))adj.get(e.source)!.push(e.target);
 const visiting=new Set<string>(),visited=new Set<string>();let cycle=false;const walk=(id:string)=>{if(visiting.has(id)){cycle=true;return}if(visited.has(id)||cycle)return;visiting.add(id);for(const n of adj.get(id)||[])walk(n);visiting.delete(id);visited.add(id)};for(const id of ids)walk(id);
 if(cycle)ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges'],message:'Workflow graph cannot contain cycles'});
 for(const[i,node]of def.nodes.entries())if(String(node.data?.kind)==='condition'){
  const outs=def.edges.filter(e=>e.source===node.id);const routes=new Set(outs.map(e=>String(e.data?.when)));
  if(!routes.has('true')||!routes.has('false'))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',i],message:'Condition node needs true and false branches'});
 }
});

export const workflowSchema=z.object({name:z.string().min(1).max(120),slug:z.string().regex(/^[a-z0-9-]+$/),description:z.string().max(1000).optional(),status:z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(),definition:workflowDefinitionSchema});
