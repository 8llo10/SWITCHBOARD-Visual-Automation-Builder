import {Router} from 'express';import {z} from 'zod';import {prisma} from '../config/prisma.js';import {executeRun} from '../engine/engine.js';
const r=Router();const schema=z.object({name:z.string().min(1),slug:z.string().min(1),description:z.string().optional(),status:z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(),definition:z.object({nodes:z.array(z.any()).min(1),edges:z.array(z.any())})});
r.get('/',async(_q,res)=>res.json(await prisma.workflow.findMany({orderBy:{updatedAt:'desc'}})));
r.post('/',async(req,res)=>{const d=schema.parse(req.body);res.status(201).json(await prisma.workflow.create({data:d as any}))});
r.get('/:id',async(req,res)=>res.json(await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}})));
r.put('/:id',async(req,res)=>{const d=schema.partial().parse(req.body);res.json(await prisma.workflow.update({where:{id:req.params.id},data:d as any}))});
r.post('/:id/run',async(req,res)=>{const workflow=await prisma.workflow.findUniqueOrThrow({where:{id:req.params.id}});const run=await prisma.workflowRun.create({data:{workflowId:workflow.id,triggerType:req.body.triggerType||'manual',triggerPayload:req.body.payload||{}}});void executeRun(run.id);res.status(202).json(run)});
r.get('/:id/runs',async(req,res)=>res.json(await prisma.workflowRun.findMany({where:{workflowId:req.params.id},orderBy:{createdAt:'desc'},take:50})));
export default r;
