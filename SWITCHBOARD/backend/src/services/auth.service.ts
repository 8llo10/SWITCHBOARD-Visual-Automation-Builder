import { prisma } from '../config/prisma.js';
import { signToken } from '../middleware/auth.js';
import { verifyPassword } from '../utils/password.js';
export async function login(email:string,password:string){const user=await prisma.user.findUnique({where:{email:email.toLowerCase()}});if(!user?.active||!(await verifyPassword(password,user.passwordHash)))return null;return{token:signToken(user),user:{id:user.id,email:user.email,name:user.name,role:user.role}}}
export async function currentUser(id:string){return prisma.user.findUnique({where:{id},select:{id:true,email:true,name:true,role:true,active:true,createdAt:true}})}
