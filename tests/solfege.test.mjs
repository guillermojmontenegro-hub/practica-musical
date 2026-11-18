import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSolfege, solfegeLevels } from '../src/solfege.mjs';
import { meters, midi } from '../src/music.mjs';
import { sumNotes } from '../src/score-model.mjs';
import { withSeed } from '../src/dom.mjs';
import { melodyQuestion } from '../src/exercises/melody.mjs';

test('every solfege level fills bars and respects melodic leaps across both staves',()=>{
 for(const type of ['sightRead','sightSing']) for(const clef of ['sol','fa','both'])
 for(const difficulty of Object.keys(solfegeLevels)) for(const meter of [...meters.simple,...meters.compound])
 for(let seed=0;seed<100;seed++) {
  const {measures,plan}=withSeed(seed,()=>generateSolfege(meter,{type,clef,difficulty}));
  assert.equal(measures.length,type==='sightSing'&&difficulty==='beginner'?2:4);
  measures.forEach((bar,index)=>{
   assert.ok(Math.abs(sumNotes(bar)-meter.beats*meter.unit)<1e-8);
   bar.forEach(note=>{
    assert.ok(Number.isFinite(note.pitch));
    if(clef==='both') assert.ok(plan[index]==='sol'?note.pitch>=-1:note.pitch<=1);
    if(difficulty==='beginner') assert.ok(!note.tuplet&&!note.tie);
   });
  });
  const notes=measures.flat();
  notes.slice(1).forEach((note,index)=>assert.ok(Math.abs(note.pitch-notes[index].pitch)<=solfegeLevels[difficulty].step));
  if(clef==='both') assert.equal(new Set(plan).size,2);
 }
});

test('singing reference starts on the first written pitch in every clef and level',()=>{
 const previous=globalThis.document;
 globalThis.document={getElementById:()=>({value:'simple'})};
 try {
  for(const clef of ['sol','fa','both']) for(const difficulty of Object.keys(solfegeLevels)) {
   const question=withSeed(7,()=>melodyQuestion('sightSing',{clef,difficulty}));
   assert.equal(question.events[0][0],midi(question.notation.measures[0][0].pitch));
   assert.ok(question.fullMelody.length>0);
   assert.equal(question.events.filter(event=>event[4]==='click').length,question.notation.meter.beats*(question.notation.measures.length+1));
   if(clef==='both')assert.ok(question.notation.staffPlan.includes('fa'));
  }
 } finally {globalThis.document=previous;}
});
