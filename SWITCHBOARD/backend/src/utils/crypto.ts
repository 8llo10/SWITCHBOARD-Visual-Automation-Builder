import crypto from 'node:crypto';
import {env} from '../config/env.js';
const key=Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY,'hex');
export function encryptJson(value:unknown){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const enc=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return Buffer.concat([iv,tag,enc]).toString('base64')}
export function decryptJson<T=Record<string,unknown>>(payload:string):T{const b=Buffer.from(payload,'base64');const iv=b.subarray(0,12),tag=b.subarray(12,28),enc=b.subarray(28);const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(enc),decipher.final()]).toString('utf8')) as T}
