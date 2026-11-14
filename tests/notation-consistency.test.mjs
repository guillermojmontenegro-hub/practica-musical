import { assertWrittenDurations } from './assert-notation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { StaveNote, Tuplet } from 'vexflow';
import { noteSpelling, tupletSpelling, tupletRanges } from '../src/notation-spec.mjs';
import { createScoreEditor, tupletNotes } from '../src/score-model.mjs';
test('quadruplets use four eighths in three eighths, not an automatically displayed 4:6 ratio',()=>{
  const notes=tupletNotes(4,3);
  const result=tupletSpelling(notes[0]);
  assert.equal(result.duration,'8');assert.equal(result.occupied,3);assert.equal(result.size,4);
  assertWrittenDurations(notes);
});
test('normal subdivisions do not acquire spurious irregular-group labels',()=>{
  for(const [size,span,duration] of [[2,2,'8'],[3,3,'8'],[4,2,'16']]){
    const result=tupletSpelling(tupletNotes(size,span)[0]);
    assert.equal(result.irregular,false);assert.equal(result.duration,duration);
  }
});
test('all n modifiers and dotted spans agree with the ticks actually used by VexFlow',()=>{
  for(const base of [.25,.5,1,2])for(const dotted of [false,true])for(const size of [2,3,4,5]){
    const bars=[[]],editor=createScoreEditor(bars,{capacity:6,unit:3,pitchFromPosition:()=>6});
    editor.apply(0,4,`n${size}@${base}@${dotted?1:0}`);
    assertWrittenDurations(bars[0]);
    const sum=bars[0].reduce((total,note)=>total+note.length,0);
    assert.ok(Math.abs(sum-base*(dotted?1.5:1))<1e-8);
  }
});
test('incomplete or non-uniform groups are rejected instead of silently showing wrong figures',()=>{
  assert.throws(()=>tupletRanges(tupletNotes(4,3).slice(0,3)),/incompleto/);
  const notes=tupletNotes(3,2);notes[1].length=1;assert.throws(()=>tupletRanges(notes),/inconsistente/);
});
