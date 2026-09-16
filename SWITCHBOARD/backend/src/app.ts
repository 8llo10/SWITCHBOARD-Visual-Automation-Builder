import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { errors } from './middleware/error.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import workflows from './routes/workflows.js';
import runs from './routes/runs.js';
import webhooks from './routes/webhooks.js';
import directory from './routes/directory.js';
import credentials from './routes/credentials.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL.split(',').map(v => v.trim()), credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'switchboard-api', version: '2.0.0' }));
app.use('/api/auth', auth);
app.use('/api/webhooks', webhooks);

app.use('/api', authenticate);
app.use('/api/users', users);
app.use('/api/workflows', workflows);
app.use('/api/runs', runs);
app.use('/api/directory', directory);
app.use('/api/credentials', credentials);

app.use(errors);
