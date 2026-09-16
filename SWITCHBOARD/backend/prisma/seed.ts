import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();
const admin = await prisma.user.upsert({
  where: { email: env.ADMIN_EMAIL.toLowerCase() },
  update: { name: env.ADMIN_NAME, active: true, role: 'ADMIN' },
  create: { email: env.ADMIN_EMAIL.toLowerCase(), name: env.ADMIN_NAME, role: 'ADMIN', passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12) },
});

const definition = { nodes:[
  {id:'1',type:'trigger',position:{x:0,y:0},data:{label:'New Employee',kind:'trigger'}},
  {id:'2',type:'action',position:{x:250,y:0},data:{label:'Create User',kind:'createUser',config:{email:'{{trigger.email}}',fullName:'{{trigger.fullName}}',department:'{{trigger.department}}',title:'{{trigger.title}}'} }},
  {id:'3',type:'condition',position:{x:500,y:0},data:{label:'Is IT?',kind:'condition',config:{field:'trigger.department',operator:'equals',value:'IT'}}},
  {id:'4',type:'action',position:{x:750,y:-100},data:{label:'IT Group',kind:'addGroup',config:{email:'{{trigger.email}}',group:'IT-Engineering'}}},
  {id:'5',type:'action',position:{x:750,y:100},data:{label:'Finance Group',kind:'addGroup',config:{email:'{{trigger.email}}',group:'Finance-Core'}}}
], edges:[
  {id:'e1-2',source:'1',target:'2'},{id:'e2-3',source:'2',target:'3'},{id:'e3-4',source:'3',target:'4',data:{when:'true'}},{id:'e3-5',source:'3',target:'5',data:{when:'false'}}
]};

await prisma.workflow.upsert({
  where:{slug:'employee-onboarding'},
  update:{definition,ownerId:admin.id},
  create:{name:'Employee Onboarding',slug:'employee-onboarding',status:'ACTIVE',description:'Create and provision a new employee automatically.',definition,ownerId:admin.id},
});
await prisma.$disconnect();
