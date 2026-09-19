const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function getPath(obj: unknown, path: string): unknown {
  if (!/^[a-zA-Z0-9_.-]+$/.test(path)) return undefined;
  let value = obj;
  for (const key of path.split('.')) {
    if (forbidden.has(key) || value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
export function render(value: unknown, ctx: unknown): any {
  if (typeof value === 'string') {
    const exact = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (exact) return getPath(ctx, exact[1].trim()) ?? '';
    return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, p) => String(getPath(ctx, p.trim()) ?? ''));
  }
  if (Array.isArray(value)) return value.map(v => render(v, ctx));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !forbidden.has(k)).map(([k,v]) => [k,render(v,ctx)]));
  return value;
}
