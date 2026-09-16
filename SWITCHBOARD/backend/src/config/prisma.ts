import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseEnv } from '../utils/databaseUrl.js';

normalizeDatabaseEnv();
export const prisma = new PrismaClient();
