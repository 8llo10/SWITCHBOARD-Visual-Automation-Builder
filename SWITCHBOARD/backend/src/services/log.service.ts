import { prisma } from '../config/prisma.js';
export async function log(runId:string,message:string,nodeId?:string,level='info',meta?:unknown){return prisma.runLog.create({data:{runId,message,nodeId,level,meta:meta as any}})}
