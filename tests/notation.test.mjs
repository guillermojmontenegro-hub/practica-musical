import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchKey, noteDuration, staff } from '../src/notation.mjs';
test('diatonic coordinates work across octaves and bass clef',()=>{
  assert.equal(pitchKey(0),'c/4');
  assert.equal(pitchKey(2),'e/4');
  assert.equal(pitchKey(-10),'g/2');
  assert.equal(pitchKey(-1),'b/3');
});
test('figures map eighth-note units and tuplets to engraving durations',()=>{
  assert.equal(noteDuration({length:1}),'8');
  assert.equal(noteDuration({length:2}),'4');
  assert.equal(noteDuration({length:3}),'4d');
  assert.equal(noteDuration({length:2/3,tuplet:{size:3}}),'8');
  assert.equal(noteDuration({length:2/5,tuplet:{size:5}}),'16');
});
test('score snapshots cannot change when the editor changes its draft',()=>{
  const measures=[[{pitch:0,length:2}]];
  const score=staff({measures});
  measures[0].push({pitch:1,length:2});
  assert.equal(score.measures[0].length,1);
});
