import { assertWrittenDurations } from './assert-notation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { rhythmQuestion } from '../src/exercises/rhythm.mjs';
import { melodyQuestion } from '../src/exercises/melody.mjs';
import { withSeed } from '../src/dom.mjs';
import { figures, figureDefinitions, midi } from '../src/music.mjs';
import { noteDuration } from '../src/notation.mjs';
import { sumNotes } from '../src/score-model.mjs';

test('every generated rhythm and melody figure has a matching tool and engraving',()=>{
 const previous=globalThis.document;let family='simple',heights='1';
 globalThis.document={getElementById:id=>({value:id==='meter-choice'?family:heights})};
 let semis=0,groups=0;
 try {
  for(family of ['simple','compound']) for(heights of ['1','2']) for(const mode of ['syncopation','poly','tuplet','dictation']) for(let seed=0;seed<100;seed++) {
   const question=withSeed(seed*8179+9,()=>mode==='dictation'?melodyQuestion('dictation'):rhythmQuestion(mode));
   const score=question.steps[0].solution,{meter}=score;
   for(const bar of [...score.measures,...(score.secondaryMeasures||[])]){assert.ok(Math.abs(sumNotes(bar)-meter.beats*meter.unit)<1e-8);assertWrittenDurations(bar);}
   for(const note of score.measures.flat()) {
    if(note.tuplet) {groups++;assert.ok([2,3,4,5].includes(note.tuplet.size));}
    else {assert.ok(figures[note.length]);assert.equal(noteDuration(note),figureDefinitions[note.length].duration);if(note.length===.5)semis++;}
   }
   const clicks=question.events.filter(event=>event[4]==='click');
   assert.equal(clicks.length,meter.beats);
   clicks.forEach((event,index)=>assert.equal(event[1],index+(mode==='dictation'?1:0)));
   // Independently derive attacks and lengths from the notation, across ties and barlines.
   const flat=score.measures.flat(),expected=[];
   let offset=meter.beats+(mode==='dictation'?1:0);
   flat.forEach((note,index)=>{
    if(index&&flat[index-1].tie&&flat[index-1].pitch===note.pitch) expected.at(-1).length+=note.length/meter.unit;
    else expected.push({pitch:midi(note.pitch),offset,length:note.length/meter.unit});
    offset+=note.length/meter.unit;
   });
   const events=question.events.filter(event=>!event[4]);
   if(mode==='dictation') events.shift(); // Initial tonic, before the count-in.
   assert.equal(events.length,expected.length);
   expected.forEach((note,index)=>{
    const actual=events[index];assert.equal(actual[0],note.pitch);assert.ok(Math.abs(actual[1]-note.offset)<1e-8);
    assert.ok(Math.abs(actual[2]-note.length*.96)<1e-8);
   });
   const backing=question.events.filter(event=>event[4]==='marimba');
   const secondary=score.secondaryMeasures;
   const expectedBack=[];let backOffset=meter.beats;
   if(secondary) secondary.flat().forEach(note=>{expectedBack.push({pitch:midi(note.pitch),offset:backOffset,length:note.length/meter.unit});backOffset+=note.length/meter.unit;});
   assert.equal(backing.length,expectedBack.length);
   backing.forEach((event,index)=>{assert.equal(event[0],expectedBack[index].pitch);assert.ok(Math.abs(event[1]-expectedBack[index].offset)<1e-8);assert.ok(Math.abs(event[2]-expectedBack[index].length*.96)<1e-8);});
  }
 } finally {globalThis.document=previous;}
 assert.ok(semis>0);assert.ok(groups>0);
});
