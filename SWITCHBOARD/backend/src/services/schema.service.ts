import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export async function ensureAuthSchema(){
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
  )`);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken"("userId", "createdAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt")');
  await prisma.$executeRawUnsafe(`DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'EmailVerificationToken_userId_fkey'
    ) THEN
      ALTER TABLE "EmailVerificationToken"
      ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`);
  await prisma.$executeRawUnsafe('UPDATE "User" SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", CURRENT_TIMESTAMP) WHERE LOWER("email") = LOWER($1)', env.ADMIN_EMAIL);
}
