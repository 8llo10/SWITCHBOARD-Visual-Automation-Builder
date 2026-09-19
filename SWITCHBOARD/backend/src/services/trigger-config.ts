import type {Prisma} from '@prisma/client';
import {AppError} from '../utils/AppError.js';
import type {WorkflowDefinition} from '../types/workflow.js';

export function resolveTriggerConfig(definition: unknown, type: string, config: Record<string, unknown>) {
  const kind = type === 'SCHEDULE' ? 'schedule' : type === 'WEBHOOK' ? 'webhook' : 'trigger';
  const candidates = (definition as WorkflowDefinition).nodes.filter(n => n.data.kind === kind);
  const node = config.nodeId ? candidates.find(n => n.id === config.nodeId) : candidates.length === 1 ? candidates[0] : undefined;
  if (!node) throw new AppError(`Select an existing ${kind} node in the saved workflow`, 400);
  const resolved: Prisma.InputJsonObject & {nodeId:string} = {...node.data.config, ...config, nodeId: node.id} as Prisma.InputJsonObject & {nodeId:string};
  if (type === 'SCHEDULE') {
    const every = Number(resolved.every);
    if (!Number.isFinite(every) || every <= 0 || !['minutes', 'hours', 'days'].includes(String(resolved.unit))) {
      throw new AppError('Schedule requires a positive interval and minutes, hours, or days', 400);
    }
  }
  return resolved;
}
