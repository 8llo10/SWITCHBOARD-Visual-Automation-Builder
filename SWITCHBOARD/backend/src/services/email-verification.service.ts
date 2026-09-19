import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const hashToken=(token:string)=>crypto.createHash('sha256').update(token).digest('hex');
const frontendBase=()=>env.FRONTEND_URL.split(',')[0]?.trim().replace(/\/$/,'')||'http://localhost:3000';

function transporter(){
  if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASS)return null;
  return nodemailer.createTransport({
    host:env.SMTP_HOST,
    port:env.SMTP_PORT,
    secure:env.SMTP_PORT===465,
    connectionTimeout:15000,socketTimeout:15000,
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},
  });
}

export async function issueVerification(user:{id:string;email:string;name:string}){
  const recent=await prisma.emailVerificationToken.findFirst({
    where:{userId:user.id,usedAt:null},
    orderBy:{createdAt:'desc'},
  });
  if(recent){
    const ageSeconds=(Date.now()-recent.createdAt.getTime())/1000;
    if(ageSeconds<env.EMAIL_VERIFY_RESEND_SECONDS){
      return {sent:false,cooldownSeconds:Math.ceil(env.EMAIL_VERIFY_RESEND_SECONDS-ageSeconds)};
    }
  }

  await prisma.emailVerificationToken.deleteMany({where:{userId:user.id,usedAt:null}});
  const token=crypto.randomBytes(32).toString('hex');
  const expiresAt=new Date(Date.now()+env.EMAIL_VERIFY_TTL_MINUTES*60_000);
  await prisma.emailVerificationToken.create({data:{userId:user.id,tokenHash:hashToken(token),expiresAt}});

  const mailer=transporter();
  if(!mailer){
    return {sent:false,cooldownSeconds:0,reason:'SMTP_NOT_CONFIGURED'} as const;
  }

  const verifyUrl=`${frontendBase()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName=user.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  try{await mailer.sendMail({
    from:env.SMTP_FROM,
    to:user.email,
    subject:'Verify your SWITCHBOARD account',
    text:`Hi ${user.name},\n\nVerify your SWITCHBOARD account using this link:\n${verifyUrl}\n\nThis link expires in ${env.EMAIL_VERIFY_TTL_MINUTES} minutes.`,
    html:`<p>Hi ${safeName},</p><p>Verify your SWITCHBOARD account:</p><p><a href="${verifyUrl}">Verify email</a></p><p>This link expires in ${env.EMAIL_VERIFY_TTL_MINUTES} minutes.</p>`,
  })}catch{return {sent:false,cooldownSeconds:0,reason:'SMTP_DELIVERY_FAILED'} as const}
  return {sent:true,cooldownSeconds:0};
}

export async function verifyEmail(rawToken:string){
  const tokenHash=hashToken(rawToken);
  const record=await prisma.emailVerificationToken.findUnique({
    where:{tokenHash},
    include:{user:true},
  });
  if(!record||record.usedAt||record.expiresAt.getTime()<Date.now())return null;

  const now=new Date();
  const user=await prisma.$transaction(async tx=>{
    const claimed=await tx.emailVerificationToken.updateMany({where:{id:record.id,usedAt:null,expiresAt:{gt:now}},data:{usedAt:now}});
    if(!claimed.count)return null;
    const updated=await tx.user.update({where:{id:record.userId},data:{emailVerifiedAt:now}});
    await tx.emailVerificationToken.update({where:{id:record.id},data:{usedAt:now}});
    await tx.emailVerificationToken.deleteMany({where:{userId:record.userId,id:{not:record.id},usedAt:null}});
    return updated;
  });
  return user;
}

export async function resendVerification(email:string){
  const normalized=email.toLowerCase();
  const user=await prisma.user.findUnique({where:{email:normalized}});
  if(!user||user.emailVerifiedAt||!user.active)return {accepted:true};
  const result=await issueVerification(user);
  return {accepted:true,...result};
}
