import{z}from'zod';export const credentialSchema=z.object({name:z.string().min(1).max(120),type:z.string().min(1).max(80),data:z.record(z.any())});
