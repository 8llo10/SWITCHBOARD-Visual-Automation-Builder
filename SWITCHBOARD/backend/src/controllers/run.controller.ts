import type{Request,Response}from'express';import*as service from'../services/run.service.js';const param=(v:string|string[])=>Array.isArray(v)?v[0]:v;
export async function get(req:Request,res:Response){return res.json(await service.get(param(req.params.id)))}
export async function approve(req:Request,res:Response){const result=await service.approve(param(req.params.id),String(req.body?.approvedBy||req.user?.email||'operator'));if(!result)return res.status(409).json({error:'No approval is waiting'});return res.status(202).json(result)}
