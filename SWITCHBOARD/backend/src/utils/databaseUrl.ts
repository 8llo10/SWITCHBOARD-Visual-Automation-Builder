function unwrap(value: string | undefined) {
  if (!value) return value;
  let v = value.trim();
  const assignment = v.match(/^(?:DATABASE_URL|DIRECT_URL)\s*=\s*(.*)$/s);
  if (assignment) v = assignment[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

function encodePassword(url: string) {
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) return url;
  const schemeEnd = url.indexOf('://') + 3;
  const at = url.lastIndexOf('@');
  if (at < schemeEnd) return url;
  const colon = url.indexOf(':', schemeEnd);
  if (colon < 0 || colon > at) return url;
  const prefix = url.slice(0, colon + 1);
  let password = url.slice(colon + 1, at);
  const suffix = url.slice(at);
  if (password.startsWith('[') && password.endsWith(']')) password = password.slice(1, -1);
  try { password = encodeURIComponent(decodeURIComponent(password)); }
  catch { password = encodeURIComponent(password); }
  return `${prefix}${password}${suffix}`;
}

export function normalizeDatabaseEnv() {
  const database = unwrap(process.env.DATABASE_URL);
  const direct = unwrap(process.env.DIRECT_URL);
  if (database) process.env.DATABASE_URL = encodePassword(database);
  if (direct) process.env.DIRECT_URL = encodePassword(direct);
}
