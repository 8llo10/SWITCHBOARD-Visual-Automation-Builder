import {redact} from '../../utils/redact.js';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { Client as SSHClient } from 'ssh2';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { render,getPath } from '../../utils/template.js';
import {decryptJson} from '../../utils/crypto.js';
import type { EngineContext,ExecutorResult,WorkflowNode } from '../../types/workflow.js';

async function cfg(node:WorkflowNode,ctx:EngineContext){const base=render(node.data.config||{},ctx) as any;if(base.credentialRef){const cred=await prisma.credential.findUniqueOrThrow({where:{id:String(base.credentialRef)}});const secret=decryptJson<any>(cred.encryptedData);delete base.credentialRef;return {...secret,...base}}return base}
export async function executeNode(node:WorkflowNode,ctx:EngineContext):Promise<ExecutorResult>{
 const c=await cfg(node,ctx);
 const secrets=['secret','password','privateKey','connectionString'].map(k=>c[k]).filter((v):v is string=>typeof v==='string');
 try{return redact(await executeConfigured(node,ctx,c),secrets)}catch(error){throw new Error(redact(error instanceof Error?error.message:'Node execution failed',secrets))}
}
async function executeConfigured(node:WorkflowNode,ctx:EngineContext,c:any):Promise<ExecutorResult>{
 const kind=node.data.kind;
 if(kind==='trigger'||kind==='webhook'||kind==='schedule'||kind==='noop') return {output:ctx.trigger};
 if(kind==='createUser'){
   const email=c.email||getPath(ctx,'trigger.email'); const fullName=c.fullName||getPath(ctx,'trigger.fullName');
   if(!email||!fullName) throw new Error('createUser requires email and fullName');
   const user=await prisma.directoryUser.upsert({where:{email},update:{fullName,department:c.department||getPath(ctx,'trigger.department')||null,title:c.title||getPath(ctx,'trigger.title')||null,active:true},create:{email,fullName,department:c.department||getPath(ctx,'trigger.department')||null,title:c.title||getPath(ctx,'trigger.title')||null}}); return {output:user};
 }
 if(kind==='disableUser'){const email=c.email||getPath(ctx,'trigger.email'); if(!email)throw new Error('disableUser requires email'); return {output:await prisma.directoryUser.update({where:{email},data:{active:false}})}}
 if(['addGroup','removeGroup','assignLicense','revokeLicense'].includes(kind)){
  const email=c.email||getPath(ctx,'trigger.email'),group=kind==='addGroup'||kind==='removeGroup',value=group?c.group:c.license;
  if(!email||!value)throw new Error(`${kind} requires email and ${group?'group':'license'}`);
  return {output:await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "DirectoryUser" WHERE email=${String(email)} FOR UPDATE`;
   const user=await tx.directoryUser.findUniqueOrThrow({where:{email:String(email)}});
   const old=group?user.groups:user.licenses;
   const values=kind==='removeGroup'||kind==='revokeLicense'?old.filter(x=>x!==value):[...new Set([...old,String(value)])];
   return tx.directoryUser.update({where:{id:user.id},data:group?{groups:values}:{licenses:values}});
  })};
 }
 if(kind==='condition'){
   const actual=getPath(ctx,c.field||'trigger.department'); const op=c.operator||'equals'; const expected=c.value;
   const ok=op==='equals'?String(actual)===String(expected):op==='notEquals'?String(actual)!==String(expected):op==='gt'?Number(actual)>Number(expected):op==='gte'?Number(actual)>=Number(expected):op==='lt'?Number(actual)<Number(expected):op==='lte'?Number(actual)<=Number(expected):op==='contains'?String(actual).includes(String(expected)):op==='exists'?actual!==undefined&&actual!==null:Boolean(actual);
   return {output:{actual,expected,matched:ok},route:ok?'true':'false'};
 }
 if(kind==='delay'){const ms=Math.min(Number(c.ms??1000),30000);await new Promise(r=>setTimeout(r,ms));return {output:{delayedMs:ms}}}
 if(kind==='health'){const url=c.url;if(!url)throw new Error('health requires url');const start=Date.now();const res=await fetch(url,{method:'GET',signal:AbortSignal.timeout(Number(c.timeoutMs||8000))});return {output:{url,status:res.status,ok:c.expectedStatus?res.status===Number(c.expectedStatus):res.ok,latencyMs:Date.now()-start}}}
 if(kind==='http'){
   if(!c.url)throw new Error('http requires url');const url=new URL(c.url);for(const [key,value] of Object.entries(c.queryParams||{}))url.searchParams.set(key,String(value));const requestBody=c.bodyType==='text'?String(c.body||''):c.bodyType==='form'?new URLSearchParams(c.body||{}).toString():JSON.stringify(c.body||{});const res=await fetch(url,{method:c.method||'GET',headers:{'Content-Type':c.bodyType==='text'?'text/plain':c.bodyType==='form'?'application/x-www-form-urlencoded':'application/json',...(c.headers||{}),...(c.secret?{[c.headerName||'Authorization']:`${c.prefix||'Bearer'} ${c.secret}`}:{}) ,...(c.username&&c.password?{Authorization:`Basic ${Buffer.from(`${c.username}:${c.password}`).toString('base64')}`}:{})},body:['GET','HEAD'].includes((c.method||'GET').toUpperCase())?undefined:requestBody,signal:AbortSignal.timeout(Number(c.timeoutMs||15000))});const text=await res.text();let body:any=text;try{body=JSON.parse(text)}catch{} if(c.expectedStatus?res.status!==Number(c.expectedStatus):!res.ok&&!c.allowNon2xx)throw new Error(`HTTP request failed with status ${res.status}`);return {output:{status:res.status,headers:Object.fromEntries(res.headers.entries()),body}};
 }
 if(kind==='postgres'){
   if(!c.connectionString||!c.query)throw new Error('postgres requires connectionString and query');const pool=new Pool({connectionString:c.connectionString,ssl:c.ssl?{rejectUnauthorized:true}:undefined,max:1,connectionTimeoutMillis:Number(c.timeoutMs||15000),statement_timeout:Number(c.timeoutMs||15000),query_timeout:Number(c.timeoutMs||15000)});try{const r=await pool.query(c.query,Array.isArray(c.params)?c.params:[]);return {output:{rowCount:r.rowCount,rows:r.rows}}}finally{await pool.end()}
 }
 if(kind==='email'){
   if(!(c.host||env.SMTP_HOST)||!(c.username||env.SMTP_USER)||!(c.password||env.SMTP_PASS))throw new Error('SMTP is not configured');const transporter=nodemailer.createTransport({host:c.host||env.SMTP_HOST,port:Number(c.port||env.SMTP_PORT),secure:Number(c.port||env.SMTP_PORT)===465,connectionTimeout:15000,socketTimeout:30000,auth:{user:c.username||env.SMTP_USER,pass:c.password||env.SMTP_PASS}});const info=await transporter.sendMail({from:env.SMTP_FROM,to:c.to||getPath(ctx,'trigger.email'),subject:c.subject||'Welcome',text:c.text||undefined,html:c.html||undefined,cc:c.cc||undefined,bcc:c.bcc||undefined});return {output:{messageId:info.messageId,accepted:info.accepted}};
 }
 if(kind==='ssh'||kind==='powershell'){
   if(!c.host||!c.username||!c.command)throw new Error(`${kind} requires host, username and command`);return {output:await new Promise((resolve,reject)=>{const client=new SSHClient();let stdout='',stderr='';const timeout=setTimeout(()=>{client.end();reject(new Error('Remote command timed out'))},Math.min(120000,Number(c.timeoutMs)||30000));client.once('close',()=>clearTimeout(timeout));client.on('ready',()=>client.exec(kind==='powershell'?`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(String(c.command),'utf16le').toString('base64')}`:c.command,(err,stream)=>{if(err){client.end();return reject(err)}stream.on('close',(code:number)=>{client.end();code===0?resolve({code,stdout,stderr}):reject(new Error(`${kind} exited with code ${code}`))}).on('data',(d:Buffer)=>stdout+=d.toString());stream.stderr.on('data',(d:Buffer)=>stderr+=d.toString())})).on('error',reject).connect({host:c.host,port:Number(c.port||22),username:c.username,password:c.password,privateKey:c.privateKey,readyTimeout:10000})})};
 }
 if(kind==='approval') return {output:{message:c.message||'Approval required'},wait:true};
 throw new Error(`Unsupported node kind: ${kind}`);
}
