import{Router}from'express';import{receive}from'../controllers/webhook.controller.js';const router=Router();router.post('/:slug',receive);export default router;
