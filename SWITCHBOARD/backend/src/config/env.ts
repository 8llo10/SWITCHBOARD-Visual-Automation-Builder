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
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Switchboard <noreply@switchboard.local>'),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
});

export const env = schema.parse(process.env);
