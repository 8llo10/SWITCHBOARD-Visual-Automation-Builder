import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/missing');
if(process.env.INTEGRATION_TESTS!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Integration tests require an explicitly enabled local *_test database');
const {prisma}=await import('../src/config/prisma.js');
const {app}=await import('../src/app.js');
const {tickQueue,stopQueue}=await import('../src/services/queue.service.js');
const {hashPassword}=await import('../src/utils/password.js');
const {encryptJson}=await import('../src/utils/crypto.js');
const suffix=crypto.randomUUID(),email=`operator-${suffix}@example.test`;
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const address=server.address();assert(address&&typeof address==='object');
const base=`http://127.0.0.1:${address.port}/api`;
let token='',workflowId='';
async function request(path:string,method='GET',body?:unknown,bearer=token){const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,data:await response.json().catch(()=>null)}}
const definition={nodes:[{id:'start',type:'custom',position:{x:0,y:0},data:{kind:'trigger',label:'Start',config:{}}},{id:'create',type:'custom',position:{x:300,y:0},data:{kind:'createUser',label:'Create user',config:{email:'{{trigger.email}}',fullName:'{{trigger.fullName}}'}}}],edges:[{id:'a',source:'start',target:'create'}]};
async function waitFor(id:string,status:string){for(let i=0;i<100;i++){await tickQueue();const run=await prisma.workflowRun.findUniqueOrThrow({where:{id}});if(run.status===status)return run;if(run.status==='FAILED'&&status!=='FAILED')throw new Error(run.error||'Run failed');await new Promise(r=>setTimeout(r,30))}throw new Error(`Run did not reach ${status}`)}
test('API, RBAC, queue, directory, approvals, cancellation and session revocation',async t=>{
 try{
  await t.test('signup requires verification and login issues a session',async()=>{const registered=await request('/auth/register','POST',{name:'Integration Operator',email,password:'Test-password-123!'},'');assert.equal(registered.status,201);assert.equal(registered.data.verificationRequired,true);assert.equal((await request('/auth/login','POST',{email,password:'Test-password-123!'},'')).status,403);await prisma.user.update({where:{email},data:{emailVerifiedAt:new Date()}});const login=await request('/auth/login','POST',{email,password:'Test-password-123!'},'');assert.equal(login.status,200);token=login.data.token;assert.equal(token.split('.').length,3)});
  await t.test('operator cannot manage users or credentials',async()=>{assert.equal((await request('/users')).status,403);assert.equal((await request('/credentials','POST',{name:'forbidden',type:'API_KEY',data:{secret:'secret'}})).status,403)});
  await t.test('workflow CRUD rejects invalid graphs',async()=>{const w=await request('/workflows','POST',{name:'Integration',slug:`integration-${suffix}`,definition});assert.equal(w.status,201);workflowId=w.data.id;assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:{nodes:definition.nodes,edges:[{id:'bad',source:'missing',target:'create'}]}})).status,400);assert.equal((await request(`/workflows/${workflowId}`,'PUT',{name:'Renamed'})).data.name,'Renamed')});
  await t.test('credential permission prevents operator use until explicitly granted',async()=>{
   const credential=await prisma.credential.create({data:{name:`secret-${suffix}`,type:'API_KEY',encryptedData:encryptJson({secret:'integration-secret'}),allowedWorkflowIds:[]}});
   try{
    const withCredential={...definition,nodes:[definition.nodes[0],{id:'http',type:'custom',position:{x:300,y:0},data:{kind:'http',label:'HTTP',config:{url:'https://example.test',credentialRef:credential.id}}}],edges:[{id:'edge',source:'start',target:'http'}]};
    assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:withCredential})).status,400);
    await prisma.credential.update({where:{id:credential.id},data:{allowedWorkflowIds:[workflowId]}});
    assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:withCredential})).status,200);
    const listed=await request('/credentials');assert.equal(listed.data.find((c:any)=>c.id===credential.id).encryptedData,undefined);
    await request(`/workflows/${workflowId}`,'PUT',{definition});
   }finally{await prisma.credential.delete({where:{id:credential.id}})}
  });
  await t.test('real queued execution persists output and directory state',async()=>{const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Integration Person'}});assert.equal(r.status,202);assert.equal(r.data.status,'QUEUED');await waitFor(r.data.id,'SUCCEEDED');const steps=await prisma.workflowStep.findMany({where:{runId:r.data.id}});assert.equal(steps.length,2);assert.equal(steps[1].status,'SUCCEEDED');assert.equal((await prisma.directoryUser.findUniqueOrThrow({where:{email}})).fullName,'Integration Person')});
  await t.test('parallel branches join only after both predecessors finish',async()=>{
   const branch=(id:string,ms:number)=>({id,type:'custom',position:{x:200,y:0},data:{kind:'delay',label:id,config:{ms}}});
   const graph={nodes:[definition.nodes[0],branch('fast',10),branch('slow',150),definition.nodes[1]],edges:[{id:'a',source:'start',target:'fast'},{id:'b',source:'start',target:'slow'},{id:'c',source:'fast',target:'create'},{id:'d',source:'slow',target:'create'}]};
   assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:graph})).status,200);
   const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Joined Person'}});await waitFor(r.data.id,'SUCCEEDED');
   const steps=await prisma.workflowStep.findMany({where:{runId:r.data.id}});const join=steps.find(s=>s.nodeId==='create')!;
   for(const id of ['fast','slow'])assert(join.startedAt!.getTime()>=steps.find(s=>s.nodeId===id)!.finishedAt!.getTime());
   assert.equal(steps.filter(s=>s.nodeId==='create').length,1);
  });
  await t.test('condition skips the unselected path and resolves its join',async()=>{
   const graph={nodes:[definition.nodes[0],{id:'condition',type:'custom',position:{x:100,y:0},data:{kind:'condition',label:'Condition',config:{field:'trigger.ok',operator:'equals',value:true}}},{id:'yes',type:'custom',position:{x:200,y:0},data:{kind:'noop',label:'Yes',config:{}}},{id:'no',type:'custom',position:{x:200,y:100},data:{kind:'noop',label:'No',config:{}}},definition.nodes[1]],edges:[{id:'a',source:'start',target:'condition'},{id:'b',source:'condition',target:'yes',data:{when:true}},{id:'c',source:'condition',target:'no',data:{when:false}},{id:'d',source:'yes',target:'create'},{id:'e',source:'no',target:'create'}]};
   await request(`/workflows/${workflowId}`,'PUT',{definition:graph});const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Conditional Person',ok:true}});await waitFor(r.data.id,'SUCCEEDED');
   assert.equal((await prisma.workflowStep.findFirstOrThrow({where:{runId:r.data.id,nodeId:'no'}})).status,'SKIPPED');
  });
  await t.test('webhook secrets authenticate and enqueue real work',async()=>{
   const graph={nodes:[{...definition.nodes[0],data:{kind:'webhook',label:'Webhook',config:{}}},definition.nodes[1]],edges:definition.edges};
   await request(`/workflows/${workflowId}`,'PUT',{definition:graph,status:'ACTIVE'});
   const trigger=await request(`/triggers/workflow/${workflowId}`,'POST',{type:'WEBHOOK',enabled:true,config:{nodeId:'start'}});assert.equal(trigger.status,201);
   assert.equal((await fetch(`${base}/webhooks/integration-${suffix}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
   const res=await fetch(`${base}/webhooks/integration-${suffix}`,{method:'POST',headers:{'content-type':'application/json','x-switchboard-secret':trigger.data.secret},body:JSON.stringify({email,fullName:'Webhook Person'})});assert.equal(res.status,202);const r=await res.json();await waitFor(r.runId,'SUCCEEDED');
   await request(`/triggers/${trigger.data.id}`,'DELETE');
  });
  await t.test('scheduler creates a single queued run per interval',async()=>{
   const {tick}=await import('../src/services/scheduler.service.js');
   const graph={nodes:[{...definition.nodes[0],data:{kind:'schedule',label:'Schedule',config:{every:5,unit:'minutes'}}}],edges:[]};await request(`/workflows/${workflowId}`,'PUT',{definition:graph,status:'ACTIVE'});
   const trigger=await request(`/triggers/workflow/${workflowId}`,'POST',{type:'SCHEDULE',enabled:true,config:{nodeId:'start',every:5,unit:'minutes'}});assert.equal(trigger.status,201);
   await Promise.all([tick(),tick()]);await tick();
   const runs=await prisma.workflowRun.findMany({where:{workflowId,triggerType:`schedule:${trigger.data.id}`}});assert.equal(runs.length,1);assert.equal(runs[0].status,'QUEUED');await waitFor(runs[0].id,'SUCCEEDED');
   await request(`/triggers/${trigger.data.id}`,'DELETE');
  });
  await t.test('approval pauses and resumes through queue',async()=>{const approval={...definition,nodes:[definition.nodes[0],{id:'approval',type:'custom',position:{x:200,y:0},data:{kind:'approval',label:'Approve',config:{}}},definition.nodes[1]],edges:[{id:'a',source:'start',target:'approval'},{id:'b',source:'approval',target:'create'}]};assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:approval})).status,200);const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Approved Person'}});await waitFor(r.data.id,'WAITING');assert.equal((await request(`/runs/${r.data.id}/approve`,'POST',{})).data.status,'QUEUED');await waitFor(r.data.id,'SUCCEEDED');assert.equal((await prisma.directoryUser.findUniqueOrThrow({where:{email}})).fullName,'Approved Person')});
  await t.test('cancelled queued run cannot be claimed',async()=>{const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Never'}});assert.equal((await request(`/runs/${r.data.id}/cancel`,'POST',{})).status,200);await tickQueue();assert.equal((await prisma.workflowRun.findUniqueOrThrow({where:{id:r.data.id}})).status,'CANCELLED')});
  await t.test('another account cannot read the workflow',async()=>{const other=await prisma.user.create({data:{email:`viewer-${suffix}@example.test`,name:'Viewer',role:'VIEWER',emailVerifiedAt:new Date(),passwordHash:await hashPassword('Test-password-123!')}});const login=await request('/auth/login','POST',{email:other.email,password:'Test-password-123!'},'');assert.equal((await request(`/workflows/${workflowId}`,'GET',undefined,login.data.token)).status,403);await prisma.workflow.update({where:{id:workflowId},data:{permittedUserIds:[other.id]}});assert.equal((await request(`/workflows/${workflowId}`,'GET',undefined,login.data.token)).status,200);assert.equal((await request(`/workflows/${workflowId}/run`,'POST',{payload:{}},login.data.token)).status,403);assert.equal((await request(`/workflows/${workflowId}`,'PUT',{name:'Denied'},login.data.token)).status,403);assert.equal((await request('/workflows','POST',{name:'No',slug:'no',definition},login.data.token)).status,403)});
  await t.test('logout invalidates copied session token',async()=>{assert.equal((await request('/auth/logout','POST',{})).status,200);assert.equal((await request('/auth/me')).status,401)});
 }finally{
  stopQueue();server.close();await once(server,'close');
  if(workflowId)await prisma.workflow.delete({where:{id:workflowId}});
  await prisma.directoryUser.deleteMany({where:{email}});
  await prisma.user.deleteMany({where:{email:{in:[email,`viewer-${suffix}@example.test`]}}});
  await prisma.$disconnect();
 }
});
