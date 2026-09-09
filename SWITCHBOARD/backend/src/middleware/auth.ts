import type {Request,Response,NextFunction} from 'express';import {env} from '../config/env.js';
export function apiKey(req:Request,res:Response,next:NextFunction){if(req.path==='/health'||req.path.startsWith('/webhooks/'))return next();if(req.header('x-api-key')!==env.API_KEY)return res.status(401).json({error:'Unauthorized'});next()}
