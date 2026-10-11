import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as controller from '../controllers/auth.controller.js';

const router=Router();
router.get('/config',controller.config);
router.post('/login',controller.login);
router.post('/register',controller.register);
router.post('/verify-email',controller.verifyEmail);
router.post('/resend-verification',controller.resendVerification);
router.get('/me',authenticate,controller.me);
export default router;
