import {prisma} from '../config/prisma.js';
import{hashPassword}from'../utils/password.js';
import{issueVerification}from'./email-verification.service.js';

export const list=()=>prisma.user.findMany({select:{id:true,email:true,name:true,role:true,active:true,emailVerifiedAt:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'}});

export async function create(input:{email:string;name:string;password:string;role:'ADMIN'|'OPERATOR'|'VIEWER'}){
  const user=await prisma.user.create({data:{email:input.email.toLowerCase(),name:input.name,passwordHash:await hashPassword(input.password),role:input.role,emailVerifiedAt:null}});
  const verification=await issueVerification(user);
  return {user,verification};
}

export const setStatus=(id:string,active:boolean)=>prisma.user.update({where:{id},data:{active}});
