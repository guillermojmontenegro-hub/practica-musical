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
   for(const bar of [...score.measures,...(score.secondaryMeasures||[])]){assert.ok(Math.abs(sumNotes(bar)-meter.beats*meter.unit)<1e-8);assertWrittenDurations(bar);
    let offset=0;
    for(let index=0;index<bar.length;index++){
     const note=bar[index];
     if(note.tuplet){
      const group=bar.slice(index,index+note.tuplet.size),span=sumNotes(group);
      assert.ok(Math.abs(offset/meter.unit-Math.round(offset/meter.unit))<1e-8,'generated group must start at a pulse');
      assert.ok(Math.abs(span-meter.unit)<1e-8,'generated group must occupy exactly one pulse');
      offset+=span;index+=group.length-1;
     }else offset+=note.length;
    }
   }
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
   const events=question.events.filter(event=>!event[4]||event[4]==='snare');
   if(mode==='dictation') events.shift(); // Initial tonic, before the count-in.
   assert.equal(events.length,expected.length);
   expected.forEach((note,index)=>{
    const actual=events[index];assert.equal(actual[0],score.secondaryMeasures?38:note.pitch);assert.ok(Math.abs(actual[1]-note.offset)<1e-8);
    assert.ok(Math.abs(actual[2]-note.length*.96)<1e-8);
   });
   const backing=question.events.filter(event=>event[4]==='cymbal');
   const secondary=score.secondaryMeasures;
   if(secondary){
    secondary.forEach((bar,index)=>{
     assert.ok(new Set(bar.map(note=>note.length)).size>1,'second voice must have a varied rhythm');
     const rhythm=notes=>notes.map(({length,tie})=>`${length}:${Boolean(tie)}`).join(',');
     assert.notEqual(rhythm(bar),rhythm(score.measures[index]),'voices must have different rhythms');
     if(mode==='poly'){
      let offset=0;
      score.measures[index].forEach(note=>{
       if(note.tuplet?.size===3&&Math.abs(offset/meter.unit-Math.round(offset/meter.unit))<1e-8){
        let lowerOffset=0,count=0;
        bar.forEach(lower=>{if(lowerOffset>=offset-1e-8&&lowerOffset<offset+meter.unit-1e-8)count++;lowerOffset+=lower.length;});
        assert.equal(count,2,'3 against 2 must share the same pulse');
       }
       offset+=note.length;
      });
     }
    });
    assert.ok(question.events.filter(event=>['snare','cymbal'].includes(event[4])).every(event=>event[3]===.19));
   }
   const expectedBack=[];let backOffset=meter.beats;
   if(secondary) secondary.flat().forEach(note=>{expectedBack.push({pitch:midi(note.pitch),offset:backOffset,length:note.length/meter.unit});backOffset+=note.length/meter.unit;});
   assert.equal(backing.length,expectedBack.length);
   backing.forEach((event,index)=>{assert.equal(event[0],49);assert.ok(Math.abs(event[1]-expectedBack[index].offset)<1e-8);assert.ok(Math.abs(event[2]-expectedBack[index].length*.96)<1e-8);});
  }
 } finally {globalThis.document=previous;}
 assert.ok(semis>0);assert.ok(groups>0);
});
