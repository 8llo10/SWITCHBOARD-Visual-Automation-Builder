import {z} from 'zod';
export const createUserSchema=z.object({email:z.string().email(),name:z.string().min(2).max(120),password:z.string().min(10),role:z.enum(['ADMIN','OPERATOR','VIEWER']).default('OPERATOR')});
export const userStatusSchema=z.object({active:z.boolean()});
