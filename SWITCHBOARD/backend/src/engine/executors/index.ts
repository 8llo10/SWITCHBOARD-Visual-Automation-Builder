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
 const c=await cfg(node,ctx); const kind=node.data.kind;
 if(kind==='trigger'||kind==='webhook'||kind==='noop') return {output:ctx.trigger};
 if(kind==='createUser'){
   const email=c.email||getPath(ctx,'trigger.email'); const fullName=c.fullName||getPath(ctx,'trigger.fullName');
   if(!email||!fullName) throw new Error('createUser requires email and fullName');
   const user=await prisma.directoryUser.upsert({where:{email},update:{fullName,department:c.department||getPath(ctx,'trigger.department')||null,title:c.title||getPath(ctx,'trigger.title')||null,active:true},create:{email,fullName,department:c.department||getPath(ctx,'trigger.department')||null,title:c.title||getPath(ctx,'trigger.title')||null}}); return {output:user};
 }
 if(kind==='disableUser'){const email=c.email||getPath(ctx,'trigger.email'); if(!email)throw new Error('disableUser requires email'); return {output:await prisma.directoryUser.update({where:{email},data:{active:false}})}}
 if(kind==='addGroup'){const email=c.email||getPath(ctx,'trigger.email');const group=c.group;if(!email||!group)throw new Error('addGroup requires email and group');const u=await prisma.directoryUser.findUniqueOrThrow({where:{email}});return {output:await prisma.directoryUser.update({where:{email},data:{groups:Array.from(new Set([...u.groups,group]))}})}}
 if(kind==='assignLicense'){const email=c.email||getPath(ctx,'trigger.email');const license=c.license;if(!email||!license)throw new Error('assignLicense requires email and license');const u=await prisma.directoryUser.findUniqueOrThrow({where:{email}});return {output:await prisma.directoryUser.update({where:{email},data:{licenses:Array.from(new Set([...u.licenses,license]))}})}}
 if(kind==='condition'){
   const actual=getPath(ctx,c.field||'trigger.department'); const op=c.operator||'equals'; const expected=c.value;
   const ok=op==='equals'?String(actual)===String(expected):op==='contains'?String(actual).includes(String(expected)):op==='exists'?actual!==undefined&&actual!==null:Boolean(actual);
   return {output:{actual,expected,matched:ok},route:ok?'true':'false'};
 }
 if(kind==='delay'){const ms=Math.min(Number(c.ms||1000),30000);await new Promise(r=>setTimeout(r,ms));return {output:{delayedMs:ms}}}
 if(kind==='health'){const url=c.url;if(!url)throw new Error('health requires url');const start=Date.now();const res=await fetch(url,{method:'GET',signal:AbortSignal.timeout(Number(c.timeoutMs||8000))});return {output:{url,status:res.status,ok:res.ok,latencyMs:Date.now()-start}}}
 if(kind==='http'){
   if(!c.url)throw new Error('http requires url');const res=await fetch(c.url,{method:c.method||'GET',headers:c.headers||{},body:['GET','HEAD'].includes((c.method||'GET').toUpperCase())?undefined:JSON.stringify(c.body||{}),signal:AbortSignal.timeout(Number(c.timeoutMs||15000))});const text=await res.text();let body:any=text;try{body=JSON.parse(text)}catch{} if(!res.ok&&!c.allowNon2xx)throw new Error(`HTTP ${res.status}: ${text.slice(0,300)}`);return {output:{status:res.status,headers:Object.fromEntries(res.headers.entries()),body}};
 }
 if(kind==='postgres'){
   if(!c.connectionString||!c.query)throw new Error('postgres requires connectionString and query');const pool=new Pool({connectionString:c.connectionString,ssl:c.ssl?{rejectUnauthorized:false}:undefined,max:1});try{const r=await pool.query(c.query,Array.isArray(c.params)?c.params:[]);return {output:{rowCount:r.rowCount,rows:r.rows}}}finally{await pool.end()}
 }
 if(kind==='email'){
   if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASS)throw new Error('SMTP is not configured');const transporter=nodemailer.createTransport({host:env.SMTP_HOST,port:env.SMTP_PORT,secure:env.SMTP_PORT===465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS}});const info=await transporter.sendMail({from:env.SMTP_FROM,to:c.to||getPath(ctx,'trigger.email'),subject:c.subject||'Welcome',text:c.text||'Welcome to the team'});return {output:{messageId:info.messageId,accepted:info.accepted}};
 }
 if(kind==='ssh'||kind==='powershell'){
   if(!c.host||!c.username||!c.command)throw new Error(`${kind} requires host, username and command`);return {output:await new Promise((resolve,reject)=>{const client=new SSHClient();let stdout='',stderr='';client.on('ready',()=>client.exec(c.command,(err,stream)=>{if(err){client.end();return reject(err)}stream.on('close',(code:number)=>{client.end();code===0?resolve({code,stdout,stderr}):reject(new Error(`${kind} exited ${code}: ${stderr}`))}).on('data',(d:Buffer)=>stdout+=d.toString());stream.stderr.on('data',(d:Buffer)=>stderr+=d.toString())})).on('error',reject).connect({host:c.host,port:Number(c.port||22),username:c.username,password:c.password,privateKey:c.privateKey,readyTimeout:10000})})};
 }
 if(kind==='approval') return {output:{message:'Approval node reached'},wait:true};
 throw new Error(`Unsupported node kind: ${kind}`);
}
