import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export type TokenPayload = { sub: string; email: string; name: string; role: Role; exp: number };
const encode=(value:string)=>Buffer.from(value).toString('base64url');
const decode=(value:string)=>Buffer.from(value,'base64url').toString('utf8');
const signature=(body:string)=>createHmac('sha256',env.JWT_SECRET).update(body).digest('base64url');

export function signToken(user:{id:string;email:string;name:string;role:Role}){
  const hours=Math.max(1,Number.parseInt(env.JWT_EXPIRES_IN,10)||8);
  const body=encode(JSON.stringify({sub:user.id,email:user.email,name:user.name,role:user.role,exp:Date.now()+hours*3600000} satisfies TokenPayload));
  return `${body}.${signature(body)}`;
}
function verifyToken(token:string):TokenPayload{
  const [body,sig]=token.split('.'); if(!body||!sig)throw new Error('Malformed token');
  const expected=signature(body); const a=Buffer.from(sig); const b=Buffer.from(expected); if(a.length!==b.length||!timingSafeEqual(a,b))throw new Error('Bad signature');
  const payload=JSON.parse(decode(body)) as TokenPayload; if(payload.exp<Date.now())throw new Error('Expired token'); return payload;
}
export function authenticate(req:Request,res:Response,next:NextFunction){
  const header=req.header('authorization'); if(!header?.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'});
  try{const payload=verifyToken(header.slice(7));req.user={id:payload.sub,email:payload.email,name:payload.name,role:payload.role};next()}catch{return res.status(401).json({error:'Invalid or expired token'})}
}
export function authorize(...roles:Role[]){return(req:Request,res:Response,next:NextFunction)=>{if(!req.user)return res.status(401).json({error:'Authentication required'});if(!roles.includes(req.user.role))return res.status(403).json({error:'Forbidden'});next()}}
