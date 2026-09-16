import {prisma} from '../config/prisma.js';import{hashPassword}from'../utils/password.js';
export const list=()=>prisma.user.findMany({select:{id:true,email:true,name:true,role:true,active:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'}});
export async function create(input:{email:string;name:string;password:string;role:'ADMIN'|'OPERATOR'|'VIEWER'}){return prisma.user.create({data:{email:input.email.toLowerCase(),name:input.name,passwordHash:await hashPassword(input.password),role:input.role}})}
export const setStatus=(id:string,active:boolean)=>prisma.user.update({where:{id},data:{active}});
