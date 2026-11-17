import test from 'node:test';
import assert from 'node:assert/strict';
import { progressionQuestion } from '../src/exercises/progression.mjs';
import { withSeed } from '../src/dom.mjs';

test('progressions respect the selected length and applied dominants resolve to their targets',()=>{
  let secondaryCount=0,diatonicCount=0;
  let outsideOctaveCount=0;
  for(const chordCount of [4,5,6,7,8])for(const oneOctave of [false,true])for(const sevenths of [false,true])for(let seed=0;seed<300;seed++) {
    const question=withSeed(seed,()=>progressionQuestion({sevenths,oneOctave,chordCount}));
    const symbols=question.steps[0].answer.split(' → ');
    assert.equal(symbols.length,chordCount);
    const groups=Array.from({length:chordCount},(_,index)=>question.events.filter(event=>event[1]===index*2));
    assert.equal(groups.flat().length,question.events.length);
    assert.ok(groups.every(group=>group.length>=3 && group.every(event=>event[2]>0 && event[0]>=36 && event[0]<=96)));
    const firstBass=groups[0][0][0];
    const inOctave=groups.every(group=>group[0][0]>=firstBass && group[0][0]<firstBass+12);
    if(oneOctave) {
      assert.ok(inOctave,'all roots stay within the octave above the first tonic');
      assert.equal(groups.at(-1)[0][0],firstBass,'the closing tonic returns to the first octave');
    } else if(!inOctave)outsideOctaveCount++;
    assert.equal(symbols[0],'I');assert.equal(symbols.at(-1),'I');
    const secondaryChords=symbols.filter(symbol=>symbol.includes('/'));
    assert.ok(secondaryChords.length<=1,'at most one secondary dominant per exercise');
    assert.deepEqual(symbols.slice(-2),['V','I']);
    if(secondaryChords.length)secondaryCount++;else diatonicCount++;
    symbols.forEach((symbol,index)=>{
      if(!symbol.includes('/'))return;
      assert.equal(symbols[index+1],symbol.split('/')[1]);
      assert.equal(groups[index].length,sevenths ? 4 : 3);
      assert.deepEqual(groups[index].map(event=>event[0]-groups[index][0][0]),sevenths ? [0,4,7,10] : [0,4,7]);
      assert.equal(((groups[index][0][0]-groups[index+1][0][0])%12+12)%12,7);
    });
    if(!sevenths) {
      assert.ok(groups.every(group=>group.length===3));
      assert.ok(!question.steps[0].answer.includes('⁷'));
    }
    assert.deepEqual(withSeed(seed,()=>progressionQuestion({sevenths,oneOctave,chordCount})).events,question.events);
  }
  assert.ok(secondaryCount>0 && diatonicCount>0);
  assert.ok(outsideOctaveCount>0,'disabling the option allows other octaves');
  const secondaryRate=secondaryCount/(secondaryCount+diatonicCount);
  assert.ok(secondaryRate>.15 && secondaryRate<.35,'secondary dominants appear occasionally; most exercises are diatonic');
});

test('the dominants option decides whether an applied dominant appears and how it is described',()=>{
  const counted=new Set();
  for(const chordCount of [4,5,6,7,8])for(const sevenths of [false,true])for(let seed=0;seed<120;seed++) {
    const results={};
    for(const mode of ['none','always','mixed'])results[mode]=withSeed(seed,()=>progressionQuestion({sevenths,chordCount,dominants:mode}));
    const secondaries=mode=>results[mode].steps[0].answer.split(' → ').filter(symbol=>symbol.includes('/'));
    assert.equal(secondaries('none').length,0,'the no-dominant option stays diatonic');
    assert.match(results['none'].context,/Sin dominantes secundarios\./);
    assert.ok(!results['none'].steps[0].explanation.includes('resuelve al grado'),'the resolution note only appears when a dominant sounds');
    assert.equal(secondaries('always').length,1,'the with-dominant option adds exactly one applied dominant');
    assert.match(results['always'].context,/Incluye 1 dominante secundario\./);
    const symbols=results['always'].steps[0].answer.split(' → ');
    const index=symbols.findIndex(symbol=>symbol.includes('/'));
    assert.ok(index>0 && index<symbols.length-2,'the applied dominant keeps the opening tonic and the closing cadence');
    assert.equal(symbols[index+1],symbols[index].split('/')[1],'the applied dominant resolves to the degree after it');
    assert.equal(results['always'].events.filter(event=>event[1]===index*2).length,sevenths ? 4 : 3,'the applied dominant carries the selected chord tones');
    assert.match(results.mixed.context,/Hasta 1 dominante secundario\./);
    assert.ok(secondaries('mixed').length<=1,'the mixed option never stacks dominants');
    if(secondaries('mixed').length)counted.add(`${chordCount}:${sevenths}:${seed}`);
    for(const other of [undefined,'unexpected']) {
      const question=withSeed(seed,()=>progressionQuestion({sevenths,chordCount,...(other===undefined?{}:{dominants:other})}));
      assert.deepEqual([question.steps[0].answer,question.events,question.context],[results.mixed.steps[0].answer,results.mixed.events,results.mixed.context],'omitting or misspelling the option keeps the mixed behaviour');
    }
  }
  assert.ok(counted.size>0 && counted.size<120*5*2,'the mixed option adds dominants sometimes but not always');
});
