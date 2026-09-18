import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { issueVerification } from './email-verification.service.js';

async function session(user:{id:string;email:string;name:string;role:'ADMIN'|'OPERATOR'|'VIEWER';emailVerifiedAt:Date|null}){
  return {token:await signToken(user),user:{id:user.id,email:user.email,name:user.name,role:user.role,emailVerifiedAt:user.emailVerifiedAt}};
}

export async function login(email:string,password:string){
  const normalized=email.toLowerCase();
  const user=await prisma.user.findUnique({where:{email:normalized}});
  if(!user?.active||!(await verifyPassword(password,user.passwordHash)))return {status:'INVALID' as const};
  const isReservedAdmin=normalized===env.ADMIN_EMAIL.toLowerCase();
  if(!isReservedAdmin&&!user.emailVerifiedAt)return {status:'UNVERIFIED' as const};
  if(isReservedAdmin&&!user.emailVerifiedAt){
    const verified=await prisma.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date()}});
    return {status:'OK' as const,...await session(verified)};
  }
  return {status:'OK' as const,...await session(user)};
}

export async function register(name:string,email:string,password:string){
  const normalized=email.toLowerCase();
  if(normalized===env.ADMIN_EMAIL.toLowerCase())return {status:'RESERVED' as const};
  const existing=await prisma.user.findUnique({where:{email:normalized},select:{id:true,emailVerifiedAt:true,active:true,name:true,email:true}});
  if(existing)return {status:'EXISTS' as const};

  const user=await prisma.user.create({
    data:{name:name.trim(),email:normalized,passwordHash:await hashPassword(password),role:'OPERATOR',active:true,emailVerifiedAt:null},
  });
  const delivery=await issueVerification(user);
  return {status:'CREATED' as const,user:{id:user.id,email:user.email,name:user.name,role:user.role,emailVerifiedAt:user.emailVerifiedAt},verification:delivery};
}

export async function currentUser(id:string){
  return prisma.user.findUnique({where:{id},select:{id:true,email:true,name:true,role:true,active:true,emailVerifiedAt:true,createdAt:true}});
}
