import { z } from 'zod';

export const loginSchema=z.object({
  email:z.string().email(),
  password:z.string().min(1),
});

export const registerSchema=z.object({
  name:z.string().min(2).max(80),
  email:z.string().email(),
  password:z.string().min(10).max(128),
});
