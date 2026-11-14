import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoreEditor, sumNotes, soundingTimeline } from '../src/score-model.mjs';
import { generateMelody, melodyEvents } from '../src/melody-patterns.mjs';
import { meters, figures } from '../src/music.mjs';
import { withSeed } from '../src/dom.mjs';
import { noteDuration } from '../src/notation.mjs';
const setup=(bars=2,capacity=4)=>{
 const measures=Array.from({length:bars},()=>[]);
 return createScoreEditor(measures,{capacity,unit:2,pitchFromPosition:p=>p,allowedPitches:[0,1,2,3,4,5,6,7]});
};
test('existing notes change pitch and duration; overflow is rejected and undo restores edits and deletion',()=>{
 const editor=setup();
 editor.apply(0,4,'2');editor.apply(0,4,'2');
 assert.equal(editor.apply(0,5,'2',0).ok,true);
 assert.equal(editor.measures[0][0].pitch,5);
 assert.equal(editor.apply(0,5,'3',0).ok,false);
 editor.apply(0,5,'0.5',0);
 assert.equal(editor.measures[0][0].length,.5);
 editor.apply(0,5,'delete',0);
 assert.equal(editor.measures[0].length,1);
 editor.undo();assert.equal(editor.measures[0][0].length,.5);
 editor.undo();assert.equal(editor.measures[0][0].length,2);
 editor.undo();assert.equal(editor.measures[0][0].pitch,4);
});
test('tuplet members change pitch independently; replacing/deleting preserves whole groups and undo',()=>{
 const editor=setup();editor.apply(0,4,'group3');
 editor.apply(0,5,'group3',1);
 assert.deepEqual(editor.measures[0].map(n=>n.pitch),[4,5,4]);
 assert.equal(sumNotes(editor.measures[0]),2);
 editor.apply(0,6,'group5',1);
 assert.equal(editor.measures[0].length,5);assert.equal(sumNotes(editor.measures[0]),2);
 editor.apply(0,6,'delete',2);assert.equal(editor.measures[0].length,0);
 editor.undo();assert.equal(editor.measures[0].length,5);
 editor.undo();assert.deepEqual(editor.measures[0].map(n=>n.pitch),[4,5,4]);
});
test('cross-bar ties sustain one event, disallow unequal pitches, and repair after edits',()=>{
 const editor=setup();editor.apply(0,4,'2');editor.apply(0,4,'2');editor.apply(1,4,'1');
 editor.apply(0,4,'tie',1);
 assert.equal(editor.measures[0][1].tie,true);
 const events=melodyEvents(editor.measures,{beats:2,unit:2});
 assert.equal(events.length,2);assert.equal(events[1][2],3/2*.96);
 editor.apply(1,5,'1',0);assert.equal(editor.measures[0][1].tie,undefined);
 assert.equal(editor.apply(0,4,'tie',1).ok,false);
 editor.undo();assert.equal(editor.measures[0][1].tie,true);
 editor.apply(0,4,'1',0);assert.equal(editor.measures[0][1].tie,undefined);
 assert.equal(editor.apply(0,4,'tie',1).ok,false);
});
test('generated melodies fill each meter, contain all irregular groups, sixteenths and cross-bar ties',()=>{
 const seen=new Set();let crossTies=0,syncopations=0,semis=0;
 for(const meter of [...meters.simple,...meters.compound]) for(let seed=0;seed<100;seed++) {
  const bars=withSeed(seed*7907+11,()=>generateMelody(meter,[2,3,4,5,6,7,8,9],7));
  assert.equal(bars.length,4);
  for(const bar of bars) {
   assert.ok(Math.abs(sumNotes(bar)-meter.beats*meter.unit)<1e-8);
   for(let i=0;i<bar.length;i++) {
    const note=bar[i];assert.ok(note.pitch>=2&&note.pitch<=9);
    if(note.tuplet) {seen.add(note.tuplet.size);assert.ok(noteDuration(note));}
    else {assert.ok(figures[note.length],`missing selectable figure ${note.length}`);if(note.length===.5) semis++;}
    if(note.tie&&i<bar.length-1) syncopations++;
   }
  }
  for(let i=0;i<3;i++) if(bars[i].at(-1).tie) {crossTies++;assert.equal(bars[i].at(-1).pitch,bars[i+1][0].pitch);}
  const flat=bars.flat();flat.forEach((note,i)=>{if(note.tie) assert.equal(note.pitch,flat[i+1].pitch);});
  assert.equal(soundingTimeline(structuredClone(flat)),soundingTimeline(flat));
 }
 assert.deepEqual([...seen].sort(),[2,3,4,5]);assert.ok(crossTies>0);assert.ok(syncopations>0);assert.ok(semis>0);
});
test('sixteenth duration matches its selectable figure and rendering',()=>{
 assert.equal(figures[.5],'Semicorchea');assert.equal(noteDuration({length:.5}),'16');
});

test('dot and n modify the selected duration and fusa is a selectable base figure',()=>{
 const editor=setup(1,6);
 editor.apply(0,4,'1');editor.apply(0,4,'dot',0);
 assert.equal(editor.measures[0][0].length,1.5);
 editor.apply(0,4,'dot',0);assert.equal(editor.measures[0][0].length,1);
 editor.apply(0,4,'n3',0);
 assert.equal(editor.measures[0].length,3);assert.equal(sumNotes(editor.measures[0]),1);
 editor.apply(0,4,'dot',1);assert.equal(sumNotes(editor.measures[0]),1.5);
 editor.apply(0,4,'ungroup',1);assert.equal(editor.measures[0].length,1);assert.equal(editor.measures[0][0].length,1.5);
 editor.apply(0,4,'0.25',0);assert.equal(editor.measures[0][0].length,.25);
 assert.equal(noteDuration(editor.measures[0][0]),'32');
 editor.apply(0,4,'d@0.25');assert.equal(editor.measures[0][1].length,.375);
});
