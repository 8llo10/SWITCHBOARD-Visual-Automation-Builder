import {Router} from 'express';import {z} from 'zod';import {prisma} from '../config/prisma.js';import {encryptJson} from '../utils/crypto.js';
const r=Router();const schema=z.object({name:z.string().min(1),type:z.string().min(1),data:z.record(z.any())});
r.get('/',async(_q,res)=>res.json(await prisma.credential.findMany({select:{id:true,name:true,type:true,createdAt:true,updatedAt:true},orderBy:{name:'asc'}})));
r.post('/',async(req,res)=>{const d=schema.parse(req.body);const c=await prisma.credential.create({data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data)}});res.status(201).json({id:c.id,name:c.name,type:c.type})});
r.put('/:id',async(req,res)=>{const d=schema.parse(req.body);const c=await prisma.credential.update({where:{id:req.params.id},data:{name:d.name,type:d.type,encryptedData:encryptJson(d.data)}});res.json({id:c.id,name:c.name,type:c.type})});
r.delete('/:id',async(req,res)=>{await prisma.credential.delete({where:{id:req.params.id}});res.status(204).end()});
export default r;
