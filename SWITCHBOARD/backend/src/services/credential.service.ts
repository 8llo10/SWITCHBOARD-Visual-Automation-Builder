import{prisma}from'../config/prisma.js';import{encryptJson}from'../utils/crypto.js';
export const list=()=>prisma.credential.findMany({select:{id:true,name:true,type:true,createdAt:true,updatedAt:true},orderBy:{name:'asc'}});
export const create=(d:{name:string;type:string;data:Record<string,any>})=>prisma.credential.create({data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data)}});
export const update=(id:string,d:{name:string;type:string;data:Record<string,any>})=>prisma.credential.update({where:{id},data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data)}});
export const remove=(id:string)=>prisma.credential.delete({where:{id}});
