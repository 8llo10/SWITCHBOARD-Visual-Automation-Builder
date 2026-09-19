import {z} from 'zod';
export const paginationSchema=z.object({limit:z.coerce.number().int().min(1).max(200).default(50),cursor:z.string().min(1).optional()});
export function pageArgs(input:unknown){const {limit,cursor}=paginationSchema.parse(input);return {take:limit,...(cursor?{cursor:{id:cursor},skip:1}:{})}}
