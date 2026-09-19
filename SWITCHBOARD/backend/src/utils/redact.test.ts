import test from 'node:test';import assert from 'node:assert/strict';import {redact} from './redact.js';
test('redacts nested secrets and credential echoes',()=>assert.deepEqual(redact({password:'pass',nested:[{Authorization:'Bearer private',body:'echo private'}]},['private']),{password:'[REDACTED]',nested:[{Authorization:'[REDACTED]',body:'echo [REDACTED]'}]}));
