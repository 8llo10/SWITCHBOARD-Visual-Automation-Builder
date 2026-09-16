import{Router}from'express';import*as controller from'../controllers/directory.controller.js';const router=Router();router.get('/users',controller.users);export default router;
