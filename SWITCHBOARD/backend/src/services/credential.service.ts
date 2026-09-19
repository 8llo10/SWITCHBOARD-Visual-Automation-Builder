import{prisma}from'../config/prisma.js';import{encryptJson}from'../utils/crypto.js';
export const list=async(user:{id:string;role:string})=>{
 const owned=user.role==='ADMIN'?[]:await prisma.workflow.findMany({where:{ownerId:user.id},select:{id:true}});
 return prisma.credential.findMany({where:user.role==='ADMIN'?{}:{allowedWorkflowIds:{hasSome:owned.map(w=>w.id)}},select:{id:true,name:true,type:true,createdAt:true,updatedAt:true,allowedWorkflowIds:true},orderBy:{name:'asc'}});
};
export const create=(d:{name:string;type:string;data:Record<string,any>;allowedWorkflowIds:string[]})=>prisma.credential.create({data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data),allowedWorkflowIds:d.allowedWorkflowIds}});
export const update=(id:string,d:{name:string;type:string;data:Record<string,any>;allowedWorkflowIds:string[]})=>prisma.credential.update({where:{id},data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data),allowedWorkflowIds:d.allowedWorkflowIds}});
export const remove=(id:string)=>prisma.credential.delete({where:{id}});
