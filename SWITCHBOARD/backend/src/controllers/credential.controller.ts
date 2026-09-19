import type{Request,Response}from'express';import*as service from'../services/credential.service.js';import{credentialSchema}from'../validators/credential.validator.js';import{audit}from'../services/audit.service.js';
const param=(v:string|string[])=>Array.isArray(v)?v[0]:v;
export async function list(_q:Request,res:Response){return res.json(await service.list(_q.user!))}
export async function create(req:Request,res:Response){const d=credentialSchema.parse(req.body);const c=await service.create(d);await audit(req,'credential.created','Credential',c.id,{name:c.name,type:c.type});return res.status(201).json({id:c.id,name:c.name,type:c.type})}
export async function update(req:Request,res:Response){const d=credentialSchema.parse(req.body);const c=await service.update(param(req.params.id),d);await audit(req,'credential.updated','Credential',c.id,{name:c.name,type:c.type});return res.json({id:c.id,name:c.name,type:c.type})}
export async function remove(req:Request,res:Response){const id=param(req.params.id);await service.remove(id);await audit(req,'credential.deleted','Credential',id);return res.status(204).end()}
