import test from 'node:test';
import assert from 'node:assert/strict';
import { readyNodes } from './graph.js';
import type { WorkflowDefinition } from '../types/workflow.js';
const def:WorkflowDefinition={nodes:['a','b','c','join'].map(id=>({id,data:{kind:'noop',label:id}})),edges:[{source:'a',target:'b',data:{when:'true'}},{source:'a',target:'c',data:{when:'false'}},{source:'b',target:'join'},{source:'c',target:'join'}]};
test('conditions enable only matching branch',()=>assert.deepEqual(readyNodes(def,{a:{status:'SUCCEEDED',route:true}}),{ready:['b'],skipped:['c']}));
test('join waits until every predecessor resolves',()=>assert.deepEqual(readyNodes(def,{a:{status:'SUCCEEDED'},b:{status:'SUCCEEDED'}}),{ready:['c'],skipped:[]}));
test('join accepts selected branch and skipped sibling',()=>assert.deepEqual(readyNodes(def,{a:{status:'SUCCEEDED',route:true},b:{status:'SUCCEEDED'},c:{status:'SKIPPED'}}),{ready:['join'],skipped:[]}));
test('waiting approval blocks dependent nodes',()=>assert.deepEqual(readyNodes(def,{a:{status:'SUCCEEDED'},b:{status:'WAITING'},c:{status:'SUCCEEDED'}}),{ready:[],skipped:[]}));
