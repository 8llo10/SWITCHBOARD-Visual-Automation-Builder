import { NextRequest, NextResponse } from 'next/server';
const base=process.env.SWITCHBOARD_API_URL||'https://switchboard-api-tqc3.onrender.com/api';
async function proxy(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params;const url=`${base}/${path.join('/')}${req.nextUrl.search}`;const headers=new Headers();const contentType=req.headers.get('content-type');if(contentType)headers.set('content-type',contentType);const authorization=req.headers.get('authorization');if(authorization)headers.set('authorization',authorization);const requestId=req.headers.get('x-request-id');if(requestId)headers.set('x-request-id',requestId);
 const init:RequestInit={method:req.method,headers,cache:'no-store'};if(!['GET','HEAD'].includes(req.method))init.body=await req.text();
 try{const upstream=await fetch(url,init);const text=await upstream.text();return new NextResponse(text,{status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/json','x-request-id':upstream.headers.get('x-request-id')||''}})}catch(e:any){return NextResponse.json({error:'Backend unavailable',detail:e.message},{status:503})}
}
export const GET=proxy;export const POST=proxy;export const PUT=proxy;export const PATCH=proxy;export const DELETE=proxy;
