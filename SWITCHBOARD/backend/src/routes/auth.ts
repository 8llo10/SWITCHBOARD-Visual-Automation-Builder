import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { verifyPassword } from '../utils/password.js';
const router=Router();const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
router.post('/login',async(req,res)=>{const input=loginSchema.parse(req.body);const user=await prisma.user.findUnique({where:{email:input.email.toLowerCase()}});if(!user?.active||!(await verifyPassword(input.password,user.passwordHash)))return res.status(401).json({error:'Invalid email or password'});const token=signToken(user);return res.json({token,user:{id:user.id,email:user.email,name:user.name,role:user.role}})});
router.get('/me',authenticate,async(req,res)=>{const user=await prisma.user.findUnique({where:{id:req.user!.id},select:{id:true,email:true,name:true,role:true,active:true,createdAt:true}});if(!user?.active)return res.status(401).json({error:'Account disabled'});return res.json(user)});
export default router;
