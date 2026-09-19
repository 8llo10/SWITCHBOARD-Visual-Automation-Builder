import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAllowedTarget} from './targets.js';
test('production integrations require approved hosts and cannot access metadata',()=>{
 assert.throws(()=>assertAllowedTarget('example.com',undefined,true));
 assert.doesNotThrow(()=>assertAllowedTarget('api.example.com','*.example.com',true));
 assert.throws(()=>assertAllowedTarget('example.com.attacker.test','*.example.com',true));
 assert.throws(()=>assertAllowedTarget('169.254.169.254','169.254.169.254',true));
 assert.doesNotThrow(()=>assertAllowedTarget('10.0.0.10','10.0.0.10',true));
});
