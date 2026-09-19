import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

export async function ensureAuthSchema(){
  const adminPasswordHash=await hashPassword(env.ADMIN_PASSWORD);
  await prisma.user.upsert({
    where:{email:env.ADMIN_EMAIL.toLowerCase()},
    update:{},
    create:{email:env.ADMIN_EMAIL.toLowerCase(),name:env.ADMIN_NAME,role:'ADMIN',active:true,passwordHash:adminPasswordHash,emailVerifiedAt:new Date()},
  });
}
