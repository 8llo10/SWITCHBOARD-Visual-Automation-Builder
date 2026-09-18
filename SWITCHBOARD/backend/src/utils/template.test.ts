import test from'node:test';import assert from'node:assert/strict';import{getPath,render}from'./template.js';
test('getPath reads nested workflow context',()=>{assert.equal(getPath({trigger:{employee:{email:'a@b.com'}}},'trigger.employee.email'),'a@b.com')});
test('render resolves nested templates across objects and arrays',()=>{const ctx={trigger:{email:'a@b.com',department:'IT'},vars:{last:{id:42}}};assert.deepEqual(render({to:'{{trigger.email}}',tags:['{{trigger.department}}','id-{{vars.last.id}}']},ctx),{to:'a@b.com',tags:['IT','id-42']})});
test('render replaces missing values safely',()=>{assert.equal(render('hello {{trigger.missing}}',{trigger:{}}),'hello ')});
