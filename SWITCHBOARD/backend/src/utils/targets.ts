export function assertAllowedTarget(hostname:string, configured=process.env.EXECUTION_ALLOWED_HOSTS, production=process.env.NODE_ENV==='production'){
 const host=hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
 if(['169.254.169.254','metadata.google.internal','metadata','fd00:ec2::254'].includes(host))throw new Error('Cloud metadata targets are not allowed');
 const allowed=(configured||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!production&&!allowed.length)return;
 if(!allowed.some(entry=>entry===host||(entry.startsWith('*.')&&host.endsWith(entry.slice(1))&&host!==entry.slice(2))))throw new Error('Integration host is not allowed. Configure EXECUTION_ALLOWED_HOSTS on the backend.');
}
