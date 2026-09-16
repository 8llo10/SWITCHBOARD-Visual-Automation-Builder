import {prisma} from '../config/prisma.js';
export const WorkflowModel={findById:(id:string)=>prisma.workflow.findUnique({where:{id}}),listByOwner:(ownerId?:string)=>prisma.workflow.findMany({where:ownerId?{ownerId}:{},orderBy:{updatedAt:'desc'}}),runs:(workflowId:string)=>prisma.workflowRun.findMany({where:{workflowId},orderBy:{createdAt:'desc'},take:50})};
