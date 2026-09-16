import{z}from'zod';
export const workflowDefinitionSchema=z.object({nodes:z.array(z.object({id:z.string().min(1),type:z.string().min(1),position:z.object({x:z.number(),y:z.number()}),data:z.record(z.any()).default({})})).min(1),edges:z.array(z.object({id:z.string().min(1),source:z.string().min(1),target:z.string().min(1)}))});
export const workflowSchema=z.object({name:z.string().min(1).max(120),slug:z.string().regex(/^[a-z0-9-]+$/),description:z.string().max(1000).optional(),status:z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(),definition:workflowDefinitionSchema});
