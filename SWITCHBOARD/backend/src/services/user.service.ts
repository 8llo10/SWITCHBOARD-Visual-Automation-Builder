import {prisma} from '../config/prisma.js';
import{hashPassword}from'../utils/password.js';
import{issueVerification,isEmailDeliveryConfigured}from'./email-verification.service.js';
import {AppError} from '../utils/AppError.js';

export const list=()=>prisma.user.findMany({select:{id:true,email:true,name:true,role:true,active:true,emailVerifiedAt:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'}});

export async function create(input:{email:string;name:string;password:string;role:'ADMIN'|'OPERATOR'|'VIEWER'}){
  if(!isEmailDeliveryConfigured())throw new AppError('Email verification delivery is unavailable. Configure SMTP before inviting accounts.',503);
  const user=await prisma.user.create({data:{email:input.email.toLowerCase(),name:input.name,passwordHash:await hashPassword(input.password),role:input.role,emailVerifiedAt:null}});
  const verification=await issueVerification(user);
  return {user,verification};
}

export const setStatus=(id:string,active:boolean)=>prisma.user.update({where:{id},data:{active}});
