import {prisma} from '../config/prisma.js';
import {pageArgs} from '../utils/pagination.js';
export const listUsers=(query:unknown={})=>prisma.directoryUser.findMany({orderBy:[{createdAt:'desc'},{id:'desc'}],...pageArgs(query)});
