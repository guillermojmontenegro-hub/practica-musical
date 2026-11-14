import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSingingMelody } from '../src/melody-patterns.mjs';
import { sumNotes } from '../src/score-model.mjs';
import { meters } from '../src/music.mjs';
import { withSeed } from '../src/dom.mjs';
import { melodyQuestion } from '../src/exercises/melody.mjs';
test('sight singing uses two short bars, basic figures and adjacent pitches within a fifth',()=>{
 for(const meter of [...meters.simple,...meters.compound]) for(const tonic of [0,-7]) for(let seed=0;seed<100;seed++) {
  const bars=withSeed(seed,()=>generateSingingMelody(meter,tonic));
  assert.equal(bars.length,2);
  for(const bar of bars) {
   assert.equal(sumNotes(bar),meter.beats*meter.unit);
   assert.ok(bar.every(note=>(meter.unit===3?note.length===3:[1,2].includes(note.length))&&!note.tie&&!note.tuplet));
  }
  const notes=bars.flat();assert.equal(notes[0].pitch,tonic);assert.equal(notes.at(-1).pitch,tonic);
  assert.ok(notes.length<=8);
  notes.forEach((note,index)=>{assert.ok(note.pitch>=tonic&&note.pitch<=tonic+4);if(index)assert.ok(Math.abs(note.pitch-notes[index-1].pitch)<=1);});
 }
});
test('singing prompts, pulse duration and full reference match the shorter phrase',()=>{
 const previous=globalThis.document;globalThis.document={getElementById:()=>({value:'simple'})};
 try {
  const question=withSeed(9,()=>melodyQuestion('sightSing'));
  const {meter,measures}=question.notation;
  assert.equal(measures.length,2);assert.equal(question.steps[0].prompt,'Cantá los dos compases.');
  assert.equal(question.events.filter(event=>event[4]==='click').length,meter.beats*3);
  assert.equal(question.fullMelody.filter(event=>!event[4]).length,measures.flat().length);
 } finally {globalThis.document=previous;}
});
