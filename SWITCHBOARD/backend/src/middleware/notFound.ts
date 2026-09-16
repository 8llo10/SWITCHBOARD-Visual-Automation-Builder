import type{Request,Response}from'express';export function notFound(req:Request,res:Response){return res.status(404).json({error:'Route not found',method:req.method,path:req.path})}
