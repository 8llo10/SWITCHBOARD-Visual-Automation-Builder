import {issueToken,readToken} from '../utils/jwt.js';
import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
export async function signToken(user:{id:string;email:string;name:string;role:Role}){
 const hours=Math.min(24,Math.max(1,Number.parseInt(env.JWT_EXPIRES_IN,10)||8));
 const expiry=new Date(Date.now()+hours*3600000),sid=randomUUID();
 await prisma.session.create({data:{id:sid,userId:user.id,expiresAt:expiry}});
 return issueToken({sub:user.id,sid,exp:Math.floor(expiry.getTime()/1000)},env.JWT_SECRET);
}
export async function authenticate(req:Request,res:Response,next:NextFunction){const header=req.header('authorization');if(!header?.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'});try{const payload=readToken(header.slice(7),env.JWT_SECRET);const session=await prisma.session.findFirst({where:{id:payload.sid,userId:payload.sub,revokedAt:null,expiresAt:{gt:new Date()}}});if(!session)return res.status(401).json({error:'Session expired'});res.locals.sessionId=payload.sid;const user=await prisma.user.findUnique({where:{id:payload.sub},select:{id:true,email:true,name:true,role:true,active:true,emailVerifiedAt:true}});if(!user?.active)return res.status(401).json({error:'Account disabled or unavailable'});const reservedAdmin=user.email.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();if(!reservedAdmin&&!user.emailVerifiedAt)return res.status(403).json({error:'Email verification required',code:'EMAIL_NOT_VERIFIED'});req.user={id:user.id,email:user.email,name:user.name,role:user.role};next()}catch{return res.status(401).json({error:'Invalid or expired token'})}}
export function authorize(...roles:Role[]){return(req:Request,res:Response,next:NextFunction)=>{if(!req.user)return res.status(401).json({error:'Authentication required'});if(!roles.includes(req.user.role))return res.status(403).json({error:'Forbidden'});next()}}
