import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoreEditor, soundingTimeline } from '../src/score-model.mjs';
import { melodyEvents } from '../src/melody-patterns.mjs';
import { assertWrittenDurations } from './assert-notation.mjs';
const meter={top:4,bottom:4,beats:4,unit:2};
const editor=measures=>createScoreEditor(measures,{capacity:8,unit:2,pitchFromPosition:()=>0});
test('whole and half notes and all rests retain the durations actually engraved',()=>{
 for(const length of [8,4,2,1,.5,.25]){
  const bars=[[]],model=editor(bars);
  assert.equal(model.apply(0,0,`r@${length}`).ok,true);
  assert.equal(bars[0][0].rest,true);assertWrittenDurations(bars[0]);
  assert.equal(model.apply(0,0,'rest',0).ok,true);assert.equal(bars[0][0].rest,false);
  assertWrittenDurations(bars[0]);
 }
});
test('silence combines with dot and n, supports undo, and cannot carry a tie',()=>{
 const bars=[[{pitch:0,length:2,tie:true},{pitch:0,length:1}]],model=editor(bars);
 model.apply(0,0,'rest',1);assert.equal(bars[0][0].tie,undefined);
 assert.equal(model.apply(0,0,'tie',0).ok,false);
 model.apply(0,0,'dot',1);assert.equal(bars[0][1].rest,true);assert.equal(bars[0][1].length,1.5);
 for(const size of [2,3,4,5]){
  model.apply(0,0,`n${size}`,1);assertWrittenDurations(bars[0]);
  assert.ok(bars[0].slice(1).every(note=>note.rest));
 }
 model.undo();assert.equal(bars[0][1].tuplet.size,4);
});
test('rests advance audio time without sounding and differ from notes in grading',()=>{
 const bars=[[{pitch:0,length:2},{pitch:0,length:2,rest:true},{pitch:0,length:4}]];
 const events=melodyEvents(bars,meter,0);
 assert.equal(events.length,2);assert.equal(events[1][1],2);assert.equal(events[1][2],1.92);
 assert.notEqual(soundingTimeline(bars.flat()),soundingTimeline(bars.flat().map(note=>({...note,rest:false}))));
});
