import { prisma } from '../config/prisma.js';
import { signToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

function session(user:{id:string;email:string;name:string;role:'ADMIN'|'OPERATOR'|'VIEWER'}){
  return {token:signToken(user),user:{id:user.id,email:user.email,name:user.name,role:user.role}};
}

export async function login(email:string,password:string){
  const user=await prisma.user.findUnique({where:{email:email.toLowerCase()}});
  if(!user?.active||!(await verifyPassword(password,user.passwordHash)))return null;
  return session(user);
}

export async function register(name:string,email:string,password:string){
  const normalized=email.toLowerCase();
  const existing=await prisma.user.findUnique({where:{email:normalized},select:{id:true}});
  if(existing)return null;
  const user=await prisma.user.create({data:{name:name.trim(),email:normalized,passwordHash:await hashPassword(password),role:'OPERATOR',active:true}});
  return session(user);
}

export async function currentUser(id:string){return prisma.user.findUnique({where:{id},select:{id:true,email:true,name:true,role:true,active:true,createdAt:true}})}
