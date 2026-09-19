import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32).default('dev-only-switchboard-jwt-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email().default('admin@switchboard.local'),
  ADMIN_PASSWORD: z.string().min(10).default('ChangeMe123!'),
  ADMIN_NAME: z.string().default('Switchboard Admin'),
  EMAIL_VERIFY_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  EMAIL_VERIFY_RESEND_SECONDS: z.coerce.number().int().min(30).max(3600).default(60),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Switchboard <noreply@switchboard.local>'),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
});

export const env = schema.parse(process.env);

if (process.env.NODE_ENV === 'production') {
  if(env.CREDENTIAL_ENCRYPTION_KEY==='0123456789abcdef'.repeat(4)||/^0+$/.test(env.CREDENTIAL_ENCRYPTION_KEY))throw new Error('Use a randomly generated credential encryption key');
  for (const key of ['JWT_SECRET', 'ADMIN_PASSWORD', 'ADMIN_EMAIL'] as const) {
    if (!process.env[key] || ['dev-only-switchboard-jwt-secret-change-me', 'ChangeMe123!', 'admin@switchboard.local'].includes(env[key])) {
      throw new Error(`${key} must be explicitly configured for production`);
    }
  }
}
