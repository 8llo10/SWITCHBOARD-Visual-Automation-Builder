import {createHmac,timingSafeEqual} from 'node:crypto';
export type Claims={sub:string;sid:string;exp:number};
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
export function issueToken(claims:Claims,secret:string){const body=`${encode({alg:'HS256',typ:'JWT'})}.${encode(claims)}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`}
export function readToken(token:string,secret:string):Claims{
 const parts=token.split('.');if(parts.length!==3)throw new Error('Invalid token');
 const [head,body,sig]=parts;const header=JSON.parse(Buffer.from(head,'base64url').toString());
 if(header.alg!=='HS256'||header.typ!=='JWT')throw new Error('Invalid token');
 const actual=Buffer.from(sig,'base64url'),expected=createHmac('sha256',secret).update(`${head}.${body}`).digest();
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Invalid token');
 const claims=JSON.parse(Buffer.from(body,'base64url').toString()) as Claims;
 if(typeof claims.sub!=='string'||typeof claims.sid!=='string'||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw new Error('Expired or invalid token');
 return claims;
}
