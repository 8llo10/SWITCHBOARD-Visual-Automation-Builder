import test from 'node:test';import assert from 'node:assert/strict';import {issueToken,readToken} from './jwt.js';
const key='test-secret-only-32-characters-long';
test('JWT validates signed claims',()=>{const c={sub:'u',sid:'s',exp:Math.floor(Date.now()/1000)+60};assert.deepEqual(readToken(issueToken(c,key),key),c)});
test('JWT rejects tampering, wrong key and expiration',()=>{const token=issueToken({sub:'u',sid:'s',exp:Math.floor(Date.now()/1000)+60},key);assert.throws(()=>readToken(token+'a',key));assert.throws(()=>readToken(token,'wrong'));assert.throws(()=>readToken(issueToken({sub:'u',sid:'s',exp:0},key),key));assert.throws(()=>readToken(token+'.extra',key))});
