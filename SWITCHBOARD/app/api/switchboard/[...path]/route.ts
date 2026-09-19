import { NextRequest, NextResponse } from 'next/server';
const base=process.env.SWITCHBOARD_API_URL||'https://switchboard-api-tqc3.onrender.com/api';
const COOKIE='switchboard_session';
async function proxy(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params;const joined=path.join('/');
 if(!['GET','HEAD'].includes(req.method)){
  const origin=req.headers.get('origin');
  const expectedOrigin=process.env.APP_ORIGIN||`${req.nextUrl.protocol}//${req.headers.get('host')||req.nextUrl.host}`;
  if(origin&&origin!==expectedOrigin)return NextResponse.json({error:'Invalid request origin'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Cross-site request denied'},{status:403});
 }
 const url=`${base}/${joined}${req.nextUrl.search}`;const headers=new Headers();const contentType=req.headers.get('content-type');if(contentType)headers.set('content-type',contentType);
 const cookieToken=req.cookies.get(COOKIE)?.value;const legacyAuth=req.headers.get('authorization');if(cookieToken)headers.set('authorization',`Bearer ${cookieToken}`);else if(legacyAuth)headers.set('authorization',legacyAuth);
 const webhookSecret=req.headers.get('x-switchboard-secret');if(joined.startsWith('webhooks/')&&webhookSecret)headers.set('x-switchboard-secret',webhookSecret);
 const requestId=req.headers.get('x-request-id');if(requestId)headers.set('x-request-id',requestId);
 const init:RequestInit={method:req.method,headers,cache:'no-store',signal:AbortSignal.timeout(30000)};if(!['GET','HEAD'].includes(req.method))init.body=await req.text();
 try{
  const upstream=await fetch(url,init);const text=await upstream.text();
  if(['auth/login','auth/refresh'].includes(joined)&&upstream.ok){let data:any={};try{data=JSON.parse(text)}catch{}const token=data?.token;const safe={...data};delete safe.token;const out=NextResponse.json(safe,{status:upstream.status});if(token)out.cookies.set(COOKIE,String(token),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*8});const rid=upstream.headers.get('x-request-id');if(rid)out.headers.set('x-request-id',rid);return out}
  const out=new NextResponse(upstream.status===204?null:text,{status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/json'}});const rid=upstream.headers.get('x-request-id');if(rid)out.headers.set('x-request-id',rid);if(upstream.status===401||(joined==='auth/logout'&&upstream.ok))out.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return out
 }catch(e:any){return NextResponse.json({error:'Backend unavailable'},{status:503})}
}
export const GET=proxy;export const POST=proxy;export const PUT=proxy;export const PATCH=proxy;export const DELETE=proxy;
