import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoreEditor,tupletNotes} from '../src/score-model.mjs';
const make=(notes,unit)=>createScoreEditor([notes],{capacity:unit*4,unit,pitchFromPosition:()=>6});
test('groups may subdivide a pulse but cannot cross its boundary in simple or compound meters',()=>{
 for(const unit of [2,3])for(const size of [2,3,4,5]){
  const model=make([{pitch:6,length:1}],unit),before=structuredClone(model.measures);
  assert.equal(model.apply(0,4,`group${size}`).ok,false);
  assert.deepEqual(model.measures,before);
  model.apply(0,4,String(unit-1));
  assert.equal(model.apply(0,4,`group${size}`).ok,true);
  assert.ok(Math.abs(model.measures[0].slice(2).reduce((sum,n)=>sum+n.length,0)-unit)<1e-8);
 }
 const short=make([{pitch:6,length:1}],2);
 assert.equal(short.apply(0,4,'n5@1@0').ok,true);
});
test('editing earlier durations, deleting, or adding dots cannot move a later group across pulses',()=>{
 const model=make([{pitch:6,length:2},...tupletNotes(5,2,6,7)],2),before=structuredClone(model.measures);
 for(const tool of ['1','dot','n3@4@0']){
  assert.equal(model.apply(0,4,tool,0).ok,false);
  assert.deepEqual(model.measures,before);
 }
 const shifted=make([{pitch:6,length:1},{pitch:6,length:1},...tupletNotes(3,2,6,8)],2);
 assert.equal(shifted.apply(0,4,'delete',0).ok,false);
 assert.equal(shifted.apply(0,4,'1',2).ok,true);
 shifted.undo();assert.equal(shifted.measures[0][2].tuplet.size,3);
});
