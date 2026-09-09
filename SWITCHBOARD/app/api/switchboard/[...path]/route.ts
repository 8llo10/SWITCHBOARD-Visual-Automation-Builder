import { NextRequest, NextResponse } from 'next/server';
const base=process.env.SWITCHBOARD_API_URL||'http://localhost:4000/api';
async function proxy(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params; const url=`${base}/${path.join('/')}${req.nextUrl.search}`;
 const headers=new Headers();headers.set('content-type','application/json');headers.set('x-api-key',process.env.SWITCHBOARD_API_KEY||'dev-switchboard-key');
 const init:RequestInit={method:req.method,headers,cache:'no-store'};if(!['GET','HEAD'].includes(req.method))init.body=await req.text();
 try{const upstream=await fetch(url,init);const text=await upstream.text();return new NextResponse(text,{status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/json'}})}catch(e:any){return NextResponse.json({error:'Backend unavailable',detail:e.message},{status:503})}
}
export const GET=proxy;export const POST=proxy;export const PUT=proxy;export const DELETE=proxy;
