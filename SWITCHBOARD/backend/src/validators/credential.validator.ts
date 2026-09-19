import{z}from'zod';
const types=['API_KEY','SSH','POSTGRES','SMTP','BASIC_AUTH'] as const;
export const credentialSchema=z.object({name:z.string().min(1).max(120),type:z.enum(types),data:z.record(z.any()),allowedWorkflowIds:z.array(z.string().min(1)).max(500).default([])}).superRefine((v,ctx)=>{
 const d=v.data||{};const need=(key:string,message:string)=>{if(!String(d[key]??'').trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:['data',key],message})};
 if(v.type==='API_KEY')need('secret','API key is required');
 if(v.type==='SSH'){need('host','SSH host is required');need('username','SSH username is required');if(!d.password&&!d.privateKey)ctx.addIssue({code:z.ZodIssueCode.custom,path:['data'],message:'SSH requires a password or private key'})}
 if(v.type==='POSTGRES')need('connectionString','PostgreSQL connection string is required');
 if(v.type==='SMTP'){need('host','SMTP host is required');need('username','SMTP username is required');need('password','SMTP password is required')}
 if(v.type==='BASIC_AUTH'){need('username','Username is required');need('password','Password is required')}
});
