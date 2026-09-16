import{prisma}from'../config/prisma.js';export const DirectoryModel={listUsers:()=>prisma.directoryUser.findMany({orderBy:{createdAt:'desc'}})};
