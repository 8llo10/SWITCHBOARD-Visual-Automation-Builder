import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionDuration} from './session.js';
test('session duration understands units and caps expiration',()=>{
 assert.equal(sessionDuration('8h'),28800);assert.equal(sessionDuration('30m'),1800);assert.equal(sessionDuration('3600'),3600);assert.equal(sessionDuration('30d'),86400);assert.throws(()=>sessionDuration('invalid'));
});
