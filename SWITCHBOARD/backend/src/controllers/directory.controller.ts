import type{Request,Response}from'express';import{listUsers}from'../services/directory.service.js';export async function users(_req:Request,res:Response){return res.json(await listUsers())}
