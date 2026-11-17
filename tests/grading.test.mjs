import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,combinedCredit,transcriptionAssessment} from '../src/grading.mjs';
import {progressionQuestion} from '../src/exercises/progression.mjs';

test('partial credit combines requested answers and does not count the given tonic',()=>{
  assert.equal(assess([{correct:true},{correct:false},{correct:true}]).credit,2/3);
  assert.equal(combinedCredit([{correct:true,earned:1,total:1},{correct:false,earned:0,total:1}]),.5);
  assert.equal(combinedCredit([{earned:2,total:3},{earned:1,total:2}]),.6);
  for(const chordCount of [4,5,6,7,8])assert.equal(progressionQuestion({chordCount}).steps[0].evaluate().total,chordCount-1);
});

test('transcription scores pitch and length separately and marks each written note',()=>{
  const expected=[[[{pitch:0,length:1},{pitch:2,length:1},{pitch:4,length:2}]]];
  const entered=[[[{pitch:0,length:1},{pitch:3,length:1},{pitch:4,length:2}]]];
  const result=transcriptionAssessment(entered,expected);
  assert.equal(result.credit,5/6);assert.equal(result.correct,false);
  assert.deepEqual(result.notation.notes,[[[true,false,true]]]);
  assert.equal(result.items.filter(item=>item.correct).length,2);
  assert.equal(transcriptionAssessment(expected,expected).credit,1);
});

test('rhythm and two voices are assessed independently, with missing or extra attacks penalized',()=>{
  const expected=[[[{pitch:6,length:2},{pitch:6,length:2}]],[[{pitch:4,length:2},{pitch:4,length:2}]]];
  const entered=structuredClone(expected);entered[1][0][1].rest=true;
  const result=transcriptionAssessment(entered,expected,{rhythm:true});
  assert.equal(result.credit,7/8);
  assert.deepEqual(result.notation.notes,[[[true,true]],[[true,false]]]);
  assert.ok(result.items.at(-1).label.startsWith('Voz 2'));
  const extra=transcriptionAssessment([[[{pitch:6,length:1},{pitch:6,length:1},{pitch:6,length:2}]]],[expected[0]],{rhythm:true});
  assert.ok(extra.items.some(item=>item.label.includes('extra')));assert.ok(extra.credit<1);
  assert.equal(transcriptionAssessment([[[]]],[expected[0]],{rhythm:true}).credit,0);
});

test('equivalent tied spellings including barlines receive full credit',()=>{
  const entered=[[[{pitch:0,length:1,tie:true}],[{pitch:0,length:1},{pitch:2,length:2}]]];
  const expected=[[[{pitch:0,length:2},{pitch:2,length:2}]]];
  const result=transcriptionAssessment(entered,expected);
  assert.equal(result.credit,1);assert.equal(result.correct,true);
  assert.deepEqual(result.notation.notes,[[[true],[true,true]]]);
});
