import test from 'node:test';
import assert from 'node:assert/strict';
import { intervalQuestion } from '../src/exercises/ear.mjs';
import { withSeed } from '../src/dom.mjs';
import { createVoiceEditors } from '../src/score-model.mjs';
test('intervals have only two notes and use a compound answer',()=>{
 const previous=globalThis.document;globalThis.document={getElementById:()=>({value:'mixed'})};
 try {for(let seed=0;seed<100;seed++) {
  const question=withSeed(seed,intervalQuestion);
  assert.equal(question.events.length,2);assert.deepEqual(question.events.map(event=>event[1]),[0,1]);
  assert.equal(question.steps[0].options,undefined);assert.equal(typeof question.steps[0].editor,'function');assert.equal(typeof question.steps[0].check,'function');
 }}finally{globalThis.document=previous;}
});
test('both voices must be complete, and global undo restores the proper voice',()=>{
 const voices=[[[],[]],[[],[]]];
 const editor=createVoiceEditors(voices,voice=>({capacity:4,unit:2,pitchFromPosition:()=>voice?4:6}));
 for(let bar=0;bar<2;bar++)for(let i=0;i<2;i++)editor.apply(bar,4,'2',null,0);
 assert.equal(editor.ready(),false);assert.equal(voices[1].flat().length,0);
 for(let bar=0;bar<2;bar++)for(let i=0;i<2;i++)editor.apply(bar,4,'2',null,1);
 assert.equal(editor.ready(),true);
 const undo=editor.undo();assert.equal(undo.voice,1);assert.equal(editor.ready(),false);assert.equal(voices[0].flat().length,4);
});
