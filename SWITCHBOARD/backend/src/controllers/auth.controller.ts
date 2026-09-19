import {audit} from '../services/audit.service.js';
import type {Request,Response} from 'express';
import {loginSchema,registerSchema,resendVerificationSchema,verifyEmailSchema} from '../validators/auth.validator.js';
import * as authService from '../services/auth.service.js';
import * as verificationService from '../services/email-verification.service.js';

export async function login(req:Request,res:Response){
  const input=loginSchema.parse(req.body);
  const result=await authService.login(input.email,input.password);
  if(result.status==='LOCKED')return res.status(429).json({error:'Too many sign-in attempts. Try again in 15 minutes.'});
  if(result.status==='INVALID'){await audit(req,'auth.login.failed','Login',authService.loginIdentity(input.email));return res.status(401).json({error:'Invalid email or password'})}
  if(result.status==='UNVERIFIED')return res.status(403).json({error:'Email verification required',code:'EMAIL_NOT_VERIFIED'});
  req.user={id:result.user.id,email:result.user.email,name:result.user.name,role:result.user.role};await audit(req,'auth.login','User',result.user.id);
  const {status,...payload}=result;
  return res.json(payload);
}

export async function register(req:Request,res:Response){
  const input=registerSchema.parse(req.body);
  const result=await authService.register(input.name,input.email,input.password);
  if(result.status==='RESERVED')return res.status(403).json({error:'This email is reserved'});
  if(result.status==='EXISTS')return res.status(409).json({error:'An account with this email already exists'});
  return res.status(201).json({
    user:result.user,
    verificationRequired:true,
    verificationSent:result.verification.sent,
    message:result.verification.sent?'Check your email to verify your account.':'Account created. Email delivery is unavailable. Try resending verification later.',
  });
}

export async function verifyEmail(req:Request,res:Response){
  const {token}=verifyEmailSchema.parse(req.body);
  const user=await verificationService.verifyEmail(token);
  if(!user)return res.status(400).json({error:'Verification link is invalid or expired',code:'INVALID_VERIFICATION_TOKEN'});
  return res.json({verified:true,user:{id:user.id,email:user.email,name:user.name,role:user.role,emailVerifiedAt:user.emailVerifiedAt}});
}

export async function resendVerification(req:Request,res:Response){
  const {email}=resendVerificationSchema.parse(req.body);
  const result=await verificationService.resendVerification(email);
  if('cooldownSeconds' in result&&result.cooldownSeconds&&result.cooldownSeconds>0){
    return res.status(429).json({error:'Please wait before requesting another verification email',retryAfterSeconds:result.cooldownSeconds});
  }
  return res.json({accepted:true,message:'If the account exists and still needs verification, a verification email will be sent.'});
}

export async function me(req:Request,res:Response){
  const user=await authService.currentUser(req.user!.id);
  if(!user?.active)return res.status(401).json({error:'Account disabled'});
  return res.json(user);
}
