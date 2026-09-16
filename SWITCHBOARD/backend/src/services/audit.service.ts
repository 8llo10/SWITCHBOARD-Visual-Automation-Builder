import type { Request } from 'express';
import { prisma } from '../config/prisma.js';

export async function audit(req: Request, action: string, entity: string, entityId?: string, metadata?: unknown) {
  await prisma.auditEvent.create({
    data: {
      actorId: req.user?.id,
      action,
      entity,
      entityId,
      metadata: metadata as any,
      ip: req.ip,
    },
  });
}
