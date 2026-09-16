import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { executeRun } from '../engine/engine.js';
import { authorize } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';

const router = Router();
const definitionSchema = z.object({
  nodes: z.array(z.object({ id:z.string().min(1), type:z.string().min(1), position:z.object({x:z.number(),y:z.number()}), data:z.record(z.any()).default({}) })).min(1),
  edges: z.array(z.object({ id:z.string().min(1), source:z.string().min(1), target:z.string().min(1) })),
});
const workflowSchema = z.object({ name:z.string().min(1).max(120), slug:z.string().regex(/^[a-z0-9-]+$/), description:z.string().max(1000).optional(), status:z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(), definition:definitionSchema });

router.get('/', async (req,res) => {
  const where = req.user!.role === 'ADMIN' ? {} : { ownerId:req.user!.id };
  return res.json(await prisma.workflow.findMany({ where, orderBy:{updatedAt:'desc'} }));
});
router.post('/', authorize('ADMIN','OPERATOR'), async (req,res) => {
  const input=workflowSchema.parse(req.body);
  const workflow=await prisma.workflow.create({data:{...input,ownerId:req.user!.id} as any});
  await audit(req,'workflow.created','Workflow',workflow.id);
  return res.status(201).json(workflow);
});
router.get('/:id', async (req,res) => {
  const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});
  if(req.user!.role!=='ADMIN' && workflow.ownerId!==req.user!.id) return res.status(403).json({error:'Forbidden'});
  return res.json(workflow);
});
router.put('/:id', authorize('ADMIN','OPERATOR'), async (req,res) => {
  const current=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});
  if(req.user!.role!=='ADMIN' && current.ownerId!==req.user!.id) return res.status(403).json({error:'Forbidden'});
  const input=workflowSchema.partial().parse(req.body);
  const workflow=await prisma.workflow.update({where:{id:current.id},data:{...input,version:{increment:1}} as any});
  await audit(req,'workflow.updated','Workflow',workflow.id,{version:workflow.version});
  return res.json(workflow);
});
router.delete('/:id', authorize('ADMIN','OPERATOR'), async (req,res) => {
  const current=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});
  if(req.user!.role!=='ADMIN' && current.ownerId!==req.user!.id) return res.status(403).json({error:'Forbidden'});
  await prisma.workflow.delete({where:{id:current.id}}); await audit(req,'workflow.deleted','Workflow',current.id); return res.status(204).end();
});
router.post('/:id/run', authorize('ADMIN','OPERATOR'), async (req,res) => {
  const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});
  if(req.user!.role!=='ADMIN' && workflow.ownerId!==req.user!.id) return res.status(403).json({error:'Forbidden'});
  if(workflow.status==='ARCHIVED') return res.status(409).json({error:'Archived workflows cannot run'});
  const run=await prisma.workflowRun.create({data:{workflowId:workflow.id,triggerType:req.body.triggerType||'manual',triggerPayload:req.body.payload||{}}});
  await audit(req,'workflow.run.started','Workflow',workflow.id,{runId:run.id});
  void executeRun(run.id); return res.status(202).json(run);
});
router.get('/:id/runs', async (req,res) => {
  const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});
  if(req.user!.role!=='ADMIN' && workflow.ownerId!==req.user!.id) return res.status(403).json({error:'Forbidden'});
  return res.json(await prisma.workflowRun.findMany({where:{workflowId:workflow.id},orderBy:{createdAt:'desc'},take:50}));
});

export default router;
