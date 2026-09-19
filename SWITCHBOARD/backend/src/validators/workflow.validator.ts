import{z}from'zod';

const supportedKinds=new Set(['trigger','createUser','disableUser','addGroup','assignLicense','removeGroup','revokeLicense','schedule','condition','email','http','postgres','webhook','ssh','powershell','health','delay','approval','noop']);
const nodeSchema=z.object({
 id:z.string().min(1),
 type:z.string().min(1),
 position:z.object({x:z.number(),y:z.number()}),
 data:z.object({kind:z.string().min(1),label:z.string().trim().min(1),config:z.record(z.any()).default({}),retry:z.number().int().min(0).max(5).optional(),continueOnFailure:z.boolean().optional()}).passthrough()
});
const edgeSchema=z.object({
 id:z.string().min(1),
 source:z.string().min(1),
 target:z.string().min(1),
 sourceHandle:z.string().optional(),
 data:z.object({when:z.union([z.string(),z.boolean()]).optional()}).passthrough().optional()
});

export const workflowDefinitionSchema=z.object({nodes:z.array(nodeSchema).min(1).max(1000),edges:z.array(edgeSchema).max(3000)}).superRefine((def,ctx)=>{
 const ids=new Set<string>();
 for(const[n,node]of def.nodes.entries()){
  if(ids.has(node.id))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'id'],message:`Duplicate node id: ${node.id}`});
  ids.add(node.id);
  const kind=String(node.data?.kind||'');
  if(!supportedKinds.has(kind))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','kind'],message:`Unsupported node kind: ${kind||'(missing)'}`});
  if(!String(node.data?.label||'').trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','label'],message:'Node label is required'});
  const c=node.data?.config||{};
  const issue=(field:string,message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config',field],message});
  for(const key of ['password','privateKey','secret','connectionString'])if(c[key])issue(key,'Store secrets in a credential and use credentialRef');
  if(kind==='approval'&&c.timeoutMinutes!==undefined&&(!Number.isFinite(Number(c.timeoutMinutes))||Number(c.timeoutMinutes)<1||Number(c.timeoutMinutes)>10080))issue('timeoutMinutes','Approval deadline must be 1 to 10080 minutes');
  if(['http','health'].includes(kind)&&c.url&&!String(c.url).includes('{{')){try{const url=new URL(c.url);if(!['http:','https:'].includes(url.protocol))issue('url','Use an HTTP or HTTPS URL')}catch{issue('url','Enter a valid URL')}}
  if(kind==='schedule'&&!['minutes','hours','days'].includes(c.unit||'minutes'))issue('unit','Choose minutes, hours, or days');
  if(c.expectedStatus!==undefined&&(!Number.isInteger(Number(c.expectedStatus))||Number(c.expectedStatus)<100||Number(c.expectedStatus)>599))issue('expectedStatus','Expected HTTP status must be 100 to 599');
  if(kind==='http'&&!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(c.method||'GET'))issue('method','Unsupported HTTP method');
  if(kind==='condition'){
   if(!c.field)issue('field','Condition field is required');
   if(!['truthy','exists'].includes(c.operator||'equals')&&c.value===undefined)issue('value','Comparison value is required');
   if(!['equals','notEquals','contains','exists','truthy','gt','gte','lt','lte'].includes(c.operator||'equals'))issue('operator','Unsupported condition operator');
  }
  if(['addGroup','removeGroup'].includes(kind)&&!c.group)issue('group','Group is required');
  if(['assignLicense','revokeLicense'].includes(kind)&&!c.license)issue('license','License is required');
  if(kind==='schedule'&&(!Number.isFinite(Number(c.every))||Number(c.every)<=0))issue('every','Positive schedule interval required');
  if(c.timeoutMs!==undefined&&(!Number.isFinite(Number(c.timeoutMs))||Number(c.timeoutMs)<1||Number(c.timeoutMs)>120000))issue('timeoutMs','Timeout must be between 1 and 120000 ms');
  if(kind==='delay'&&(!Number.isFinite(Number(c.ms??1000))||Number(c.ms??1000)<0||Number(c.ms??1000)>30000))issue('ms','Delay must be between 0 and 30000 ms');
  if(kind==='health'&&!c.url)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config','url'],message:'Health Check requires a URL'});
  if(kind==='http'&&!c.url)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config','url'],message:'HTTP Request requires a URL'});
  if(kind==='postgres'&&(!c.credentialRef||!c.query))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config'],message:'PostgreSQL requires a saved credential and query'});
  if((kind==='ssh'||kind==='powershell')&&((!c.host||!c.username)&&!c.credentialRef||!c.command))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',n,'data','config'],message:`${kind} requires connection details/credential and command`});
 }
 if(!def.nodes.some(n=>['trigger','webhook','schedule'].includes(String(n.data?.kind))))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes'],message:'Workflow requires at least one trigger node'});
 const edgeIds=new Set<string>();
 for(const[i,e]of def.edges.entries()){
  if(edgeIds.has(e.id))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'id'],message:`Duplicate edge id: ${e.id}`});
  edgeIds.add(e.id);
  if(!ids.has(e.source))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'source'],message:`Unknown source node: ${e.source}`});
  if(!ids.has(e.target))ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i,'target'],message:`Unknown target node: ${e.target}`});
  if(e.source===e.target)ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges',i],message:'Self-connections are not allowed'});
 }
 for(const [index,node] of def.nodes.entries()){const incoming=def.edges.some(e=>e.target===node.id);const trigger=['trigger','webhook','schedule'].includes(String(node.data.kind));if(trigger&&incoming)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',index],message:'Trigger nodes cannot have incoming connections'});if(!trigger&&!incoming)ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',index],message:'Connect this node to a trigger path'});}
 const adj=new Map<string,string[]>();for(const id of ids)adj.set(id,[]);for(const e of def.edges)if(ids.has(e.source)&&ids.has(e.target))adj.get(e.source)!.push(e.target);
 const visiting=new Set<string>(),visited=new Set<string>();let cycle=false;const walk=(id:string)=>{if(visiting.has(id)){cycle=true;return}if(visited.has(id)||cycle)return;visiting.add(id);for(const n of adj.get(id)||[])walk(n);visiting.delete(id);visited.add(id)};for(const id of ids)walk(id);
 if(cycle)ctx.addIssue({code:z.ZodIssueCode.custom,path:['edges'],message:'Workflow graph cannot contain cycles'});
 for(const[i,node]of def.nodes.entries())if(String(node.data?.kind)==='condition'){
  const outs=def.edges.filter(e=>e.source===node.id);const routes=new Set(outs.map(e=>String(e.data?.when)));
  if(!routes.has('true')||!routes.has('false'))ctx.addIssue({code:z.ZodIssueCode.custom,path:['nodes',i],message:'Condition node needs true and false branches'});
 }
});

export const workflowSchema=z.object({name:z.string().min(1).max(120),permittedUserIds:z.array(z.string().min(1)).max(500).optional(),slug:z.string().regex(/^[a-z0-9-]+$/),description:z.string().max(1000).optional(),status:z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(),definition:workflowDefinitionSchema});
