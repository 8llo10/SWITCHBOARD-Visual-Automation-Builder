const sensitive=/^(password|passwordHash|secret|token|access_token|refresh_token|authorization|cookie|set-cookie|privateKey|connectionString|encryptedData|api[_-]?key)$/i;
export function redact(value:unknown,secrets:string[]=[]):any{
 if(typeof value==='string')return secrets.filter(s=>s.length>=4).reduce((text,secret)=>text.split(secret).join('[REDACTED]'),value);
 if(Array.isArray(value))return value.map(v=>redact(v,secrets));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,sensitive.test(key)?'[REDACTED]':redact(v,secrets)]));
 return value;
}
