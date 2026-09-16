import type{Request,Response}from'express';import{prisma}from'../config/prisma.js';
export function live(_req:Request,res:Response){return res.json({ok:true,service:'switchboard-api',version:'2.0.0',uptime:Math.round(process.uptime()),timestamp:new Date().toISOString()})}
export async function ready(_req:Request,res:Response){try{await prisma.$queryRaw`SELECT 1`;return res.json({ok:true,database:'connected',timestamp:new Date().toISOString()})}catch{return res.status(503).json({ok:false,database:'unavailable',timestamp:new Date().toISOString()})}}
