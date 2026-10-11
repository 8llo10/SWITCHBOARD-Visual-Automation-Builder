import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

/**
 * Bootstrap the administrator only if missing.
 * Never reset a stored production password or reactivate a disabled account
 * just because a service restarted.
 */
export async function ensureAuthSchema(){
  const email=env.ADMIN_EMAIL.toLowerCase();
  const exists=await prisma.user.findUnique({where:{email},select:{id:true}});
  if(exists)return;
  const adminPasswordHash=await hashPassword(env.ADMIN_PASSWORD);
  try{
    await prisma.user.create({data:{email,name:env.ADMIN_NAME,active:true,role:'ADMIN',passwordHash:adminPasswordHash,emailVerifiedAt:new Date()}});
  }catch(error:any){
    // Another worker may have bootstrapped the same user.
    if(error?.code!=='P2002')throw error;
  }
}
