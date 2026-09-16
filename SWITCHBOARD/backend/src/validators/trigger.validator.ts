import{z}from'zod';export const triggerSchema=z.object({type:z.enum(['MANUAL','WEBHOOK','SCHEDULE']),enabled:z.boolean().default(true),config:z.record(z.any()).default({})});
