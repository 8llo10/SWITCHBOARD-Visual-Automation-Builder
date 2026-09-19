import type{Request,Response}from'express';
import*as service from'../services/user.service.js';
import{createUserSchema,userStatusSchema}from'../validators/user.validator.js';
import{audit}from'../services/audit.service.js';
const param=(v:string|string[])=>Array.isArray(v)?v[0]:v;
export async function list(_req:Request,res:Response){return res.json(await service.list(_req.query))}
export async function create(req:Request,res:Response){
  const input=createUserSchema.parse(req.body);
  const result=await service.create(input);
  const user=result.user;
  await audit(req,'user.created','User',user.id,{role:user.role,verificationSent:result.verification.sent});
  return res.status(201).json({id:user.id,email:user.email,name:user.name,role:user.role,active:user.active,emailVerifiedAt:user.emailVerifiedAt,verificationSent:result.verification.sent});
}
export async function status(req:Request,res:Response){const{active}=userStatusSchema.parse(req.body);const user=await service.setStatus(param(req.params.id),active);await audit(req,active?'user.enabled':'user.disabled','User',user.id);return res.json({id:user.id,active:user.active})}
