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
  await t.test('approval pauses and resumes through queue',async()=>{const approval={...definition,nodes:[definition.nodes[0],{id:'approval',type:'custom',position:{x:200,y:0},data:{kind:'approval',label:'Approve',config:{}}},definition.nodes[1]],edges:[{id:'a',source:'start',target:'approval'},{id:'b',source:'approval',target:'create'}]};assert.equal((await request(`/workflows/${workflowId}`,'PUT',{definition:approval})).status,200);const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Approved Person'}});await waitFor(r.data.id,'WAITING');assert.equal((await request(`/runs/${r.data.id}/approve`,'POST',{})).data.status,'QUEUED');await waitFor(r.data.id,'SUCCEEDED');assert.equal((await prisma.directoryUser.findUniqueOrThrow({where:{email}})).fullName,'Approved Person')});
  await t.test('cancelled queued run cannot be claimed',async()=>{const r=await request(`/workflows/${workflowId}/run`,'POST',{payload:{email,fullName:'Never'}});assert.equal((await request(`/runs/${r.data.id}/cancel`,'POST',{})).status,200);await tickQueue();assert.equal((await prisma.workflowRun.findUniqueOrThrow({where:{id:r.data.id}})).status,'CANCELLED')});
  await t.test('another account cannot read the workflow',async()=>{const other=await prisma.user.create({data:{email:`viewer-${suffix}@example.test`,name:'Viewer',role:'VIEWER',emailVerifiedAt:new Date(),passwordHash:await hashPassword('Test-password-123!')}});const login=await request('/auth/login','POST',{email:other.email,password:'Test-password-123!'},'');assert.equal((await request(`/workflows/${workflowId}`,'GET',undefined,login.data.token)).status,403);assert.equal((await request('/workflows','POST',{name:'No',slug:'no',definition},login.data.token)).status,403)});
  await t.test('logout invalidates copied session token',async()=>{assert.equal((await request('/auth/logout','POST',{})).status,200);assert.equal((await request('/auth/me')).status,401)});
 }finally{
  stopQueue();server.close();await once(server,'close');
  if(workflowId)await prisma.workflow.delete({where:{id:workflowId}});
  await prisma.directoryUser.deleteMany({where:{email}});
  await prisma.user.deleteMany({where:{email:{in:[email,`viewer-${suffix}@example.test`]}}});
  await prisma.$disconnect();
 }
});
