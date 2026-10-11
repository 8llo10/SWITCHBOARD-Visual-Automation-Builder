/**
 * Process readiness is deliberately separate from HTTP liveness.
 * Render must be able to probe /health even when the database is unavailable.
 */
export type StartupPhase='initializing'|'ready'|'unavailable'|'stopping';
let phase:StartupPhase='initializing';
let attempts=0;
let lastAttemptAt:string|null=null;
let lastReadyAt:string|null=null;
export function beginStartupAttempt(){phase='initializing';attempts++;lastAttemptAt=new Date().toISOString()}
export function markReady(){phase='ready';lastReadyAt=new Date().toISOString()}
export function markUnavailable(){phase='unavailable'}
export function markStopping(){phase='stopping'}
export function isBackendReady(){return phase==='ready'}
export function startupStatus(){return {phase,ready:isBackendReady(),attempts,lastAttemptAt,lastReadyAt}}
