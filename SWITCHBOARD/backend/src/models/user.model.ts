import {prisma} from '../config/prisma.js';
export const UserModel={findByEmail:(email:string)=>prisma.user.findUnique({where:{email}}),findById:(id:string)=>prisma.user.findUnique({where:{id}}),list:()=>prisma.user.findMany({orderBy:{createdAt:'desc'}})};
