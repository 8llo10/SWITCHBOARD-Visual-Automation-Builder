import type {Request,Response} from 'express';
import {loginSchema,registerSchema} from '../validators/auth.validator.js';
import * as authService from '../services/auth.service.js';

export async function login(req:Request,res:Response){
  const input=loginSchema.parse(req.body);
  const result=await authService.login(input.email,input.password);
  if(!result)return res.status(401).json({error:'Invalid email or password'});
  return res.json(result);
}

export async function register(req:Request,res:Response){
  const input=registerSchema.parse(req.body);
  const result=await authService.register(input.name,input.email,input.password);
  if(!result)return res.status(409).json({error:'An account with this email already exists'});
  return res.status(201).json(result);
}

export async function me(req:Request,res:Response){
  const user=await authService.currentUser(req.user!.id);
  if(!user?.active)return res.status(401).json({error:'Account disabled'});
  return res.json(user);
}
