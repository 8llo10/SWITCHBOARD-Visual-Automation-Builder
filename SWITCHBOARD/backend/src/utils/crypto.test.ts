import test from 'node:test';import assert from 'node:assert/strict';
process.env.DATABASE_URL||='postgresql://test:test@localhost:5432/switchboard_test';
process.env.CREDENTIAL_ENCRYPTION_KEY||='a1'.repeat(32);
const {encryptJson,decryptJson}=await import('./crypto.js');
test('credential ciphertext uses random nonces and authenticates contents',()=>{
 const data={password:'test-only-secret'},first=encryptJson(data),second=encryptJson(data);
 assert.notEqual(first,second);assert.deepEqual(decryptJson(first),data);assert(!first.includes(data.password));
 const damaged=Buffer.from(first,'base64');damaged[damaged.length-1]^=1;assert.throws(()=>decryptJson(damaged.toString('base64')));
});
