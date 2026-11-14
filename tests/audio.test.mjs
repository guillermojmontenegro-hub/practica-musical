import test from 'node:test';
import assert from 'node:assert/strict';
import { rhythmEvents } from '../src/rhythm-playback.mjs';
import { tupletNotes } from '../src/score-model.mjs';
import { instruments, unlockAudio, playExercise, stopExerciseAudio } from '../src/audio.mjs';
test('Web Audio scheduling uses the same compound pulses, subdivisions and tied durations as the score',async ()=>{
 const oscillators=[];
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class AudioContext {
  currentTime=100;state='running';destination={};
  async resume(){}
  createGain(){return {gain:param(),connect(){return this;},disconnect(){}};}
  createOscillator(){const osc={frequency:{value:0},connect(){return this;},disconnect(){},start(time){this.started=time;},stop(time){this.stopped??=time;},addEventListener(){}};oscillators.push(osc);return osc;}
 }
 const previous=globalThis.window;globalThis.window={AudioContext};
 try {
  assert.equal(await unlockAudio(),true);
  const meter={top:6,bottom:8,beats:2,unit:3};
  const bars=[[{pitch:6,length:.5},{pitch:6,length:.5},...tupletNotes(3,2,6,1),{pitch:6,length:3,tie:true}],[{pitch:6,length:1},...tupletNotes(5,3,6,2),{pitch:6,length:2}]];
  const events=rhythmEvents(bars,meter,[[0,1.5,3,4.5],[0,1.5,3,4.5]]);
  playExercise(events,{instrument:'flute',bpm:90},()=>{});
  let cursor=0;
  for(const [pitch,offset,length,,voice] of events) {
   const osc=oscillators[cursor],beat=60/90;
   assert.ok(Math.abs(osc.started-(100.035+offset*beat))<1e-8);
   assert.ok(Math.abs(osc.stopped-osc.started-((voice==='click'?.052:length*beat)+.008))<1e-8);
   assert.ok(Math.abs(osc.frequency.value-440*2**((pitch-69)/12))<1e-8);
   cursor+=instruments[voice||'flute'].partials.length;
  }
  assert.equal(cursor,oscillators.length);stopExerciseAudio();
 } finally {globalThis.window=previous;}
});
