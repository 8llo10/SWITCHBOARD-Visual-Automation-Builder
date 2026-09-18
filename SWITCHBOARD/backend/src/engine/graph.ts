import type { WorkflowDefinition } from '../types/workflow.js';
export type Outcome = { status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'WAITING'; route?: string | boolean };
export function readyNodes(def: WorkflowDefinition, outcomes: Record<string, Outcome>) {
  const ready: string[] = [], skipped: string[] = [];
  for (const node of def.nodes) {
    if (Object.hasOwn(outcomes, node.id)) continue;
    const incoming = def.edges.filter(e => e.target === node.id);
    if (!incoming.length) { ready.push(node.id); continue; }
    if (incoming.some(e => !outcomes[e.source] || outcomes[e.source].status === 'WAITING')) continue;
    const enabled = incoming.some(e => {
      const result = outcomes[e.source];
      if (result.status === 'SKIPPED') return false;
      const route = e.data?.when ?? e.sourceHandle;
      return result.route === undefined || route === undefined || String(route) === String(result.route);
    });
    (enabled ? ready : skipped).push(node.id);
  }
  return { ready, skipped };
}
