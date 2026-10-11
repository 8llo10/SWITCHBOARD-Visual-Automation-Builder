import { prisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';

/**
 * Emergency owner-only recovery command to run in the backend's trusted shell.
 * Required env vars: ADMIN_EMAIL and ADMIN_PASSWORD. No HTTP route is exposed.
 * Never put the new password into command arguments, source code, or logs.
 */
async function resetAdmin(){
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 const password=process.env.ADMIN_PASSWORD;
 if(!email||!password||password.length<12||password==='ChangeMe123!'){
  throw new Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (12+ characters) in the server environment before resetting.');
 }
 const exists=await prisma.user.findUnique({where:{email},select:{id:true}});
 if(!exists)throw new Error('Administrator does not exist. Provision the account at backend startup first.');
 await prisma.user.update({where:{email},data:{passwordHash:await hashPassword(password),emailVerifiedAt:new Date(),active:true,role:'ADMIN'}});
 console.log('Administrator credentials updated for the configured ADMIN_EMAIL.');
}
resetAdmin().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
