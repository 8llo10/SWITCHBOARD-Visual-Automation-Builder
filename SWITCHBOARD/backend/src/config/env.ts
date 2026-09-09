import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({PORT:z.coerce.number().default(4000),DATABASE_URL:z.string().min(1),FRONTEND_URL:z.string().default('http://localhost:3000'),API_KEY:z.string().min(8).default('dev-switchboard-key'),SMTP_HOST:z.string().optional(),SMTP_PORT:z.coerce.number().default(587),SMTP_USER:z.string().optional(),SMTP_PASS:z.string().optional(),SMTP_FROM:z.string().default('Switchboard <noreply@switchboard.local>'),CREDENTIAL_ENCRYPTION_KEY:z.string().regex(/^[0-9a-fA-F]{64}$/)});
export const env=schema.parse(process.env);
