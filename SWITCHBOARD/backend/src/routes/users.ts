import{Router}from'express';import{authorize}from'../middleware/auth.js';import*as controller from'../controllers/user.controller.js';
const router=Router();router.use(authorize('ADMIN'));router.get('/',controller.list);router.post('/',controller.create);router.patch('/:id/status',controller.status);export default router;
