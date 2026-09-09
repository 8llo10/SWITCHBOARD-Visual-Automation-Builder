import {Router} from 'express';import {prisma} from '../config/prisma.js';import {executeRun} from '../engine/engine.js';const r=Router();
r.post('/:slug',async(req,res)=>{const workflow=await prisma.workflow.findUnique({where:{slug:req.params.slug}});if(!workflow)return res.status(404).json({error:'Workflow not found'});const run=await prisma.workflowRun.create({data:{workflowId:workflow.id,triggerType:'webhook',triggerPayload:req.body||{}}});void executeRun(run.id);res.status(202).json({runId:run.id,status:'QUEUED'})});
export default r;
