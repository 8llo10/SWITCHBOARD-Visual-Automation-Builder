import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { signToken } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';
import * as controller from '../controllers/auth.controller.js';

const router=Router();
router.post('/login',controller.login);
router.post('/register',controller.register);
router.post('/verify-email',controller.verifyEmail);
router.post('/resend-verification',controller.resendVerification);
router.get('/me',authenticate,controller.me);
router.post('/logout',authenticate,async (_req,res)=>{await prisma.session.updateMany({where:{id:res.locals.sessionId,revokedAt:null},data:{revokedAt:new Date()}});res.json({ok:true})});
router.post('/refresh',authenticate,async (req,res)=>{const token=await signToken(req.user!);await prisma.session.updateMany({where:{id:res.locals.sessionId,revokedAt:null},data:{revokedAt:new Date()}});res.json({token})});
export default router;
