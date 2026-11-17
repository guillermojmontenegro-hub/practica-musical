import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMelody} from '../src/melody-patterns.mjs';
import {melodyQuestion} from '../src/exercises/melody.mjs';
import {meters} from '../src/music.mjs';
import {sumNotes,soundingNotes,groupsFitPulses} from '../src/score-model.mjs';
import {withSeed} from '../src/dom.mjs';

test('two- and four-bar melodies fill every meter and keep ties inside the phrase',()=>{
  for(const meter of [...meters.simple,...meters.compound])for(const count of [2,4])for(let seed=0;seed<100;seed++) {
    const bars=withSeed(seed,()=>generateMelody(meter,[0,1,2,3,4,5,6,7],0,count));
    assert.equal(bars.length,count);assert.ok(groupsFitPulses(bars,meter.unit));
    bars.forEach(bar=>assert.ok(Math.abs(sumNotes(bar)-meter.beats*meter.unit)<1e-8));
    const flat=bars.flat();assert.ok(!flat.at(-1).tie);
    flat.forEach((note,index)=>{if(note.tie)assert.equal(note.pitch,flat[index+1].pitch);});
  }
});

test('dictation defaults to two bars and audio, blank score and reference follow the selection',()=>{
  const previous=globalThis.document;
  globalThis.document={getElementById:id=>({value:id==='meter-choice'?'simple':'2'})};
  try {
    assert.equal(withSeed(7,()=>melodyQuestion('dictation')).notation.measures.length,2);
    assert.equal(withSeed(7,()=>melodyQuestion('sightRead')).notation.measures.length,4);
    assert.equal(withSeed(7,()=>melodyQuestion('sightSing')).notation.measures.length,2);
    for(const barCount of [2,4])for(let seed=0;seed<100;seed++) {
      const question=withSeed(seed,()=>melodyQuestion('dictation',{barCount}));
      const {meter,measures}=question.steps[0].solution;
      assert.equal(measures.length,barCount);assert.equal(question.notation.measures.length,barCount);
      assert.ok(question.notation.measures.every(bar=>bar.length===0));
      assert.ok(question.context.includes(`${barCount} compases`));
      const expected=soundingNotes(measures.flat());
      const events=question.events.filter(event=>!event[4]).slice(1);
      assert.equal(events.length,expected.length);
      let offset=1+meter.beats;
      expected.forEach((note,index)=>{
        assert.ok(Math.abs(events[index][1]-offset)<1e-8);
        assert.ok(Math.abs(events[index][2]-note.length/meter.unit*.96)<1e-8);
        offset+=note.length/meter.unit;
      });
      assert.ok(Math.abs(offset-(1+meter.beats+barCount*meter.beats))<1e-8);
    }
  } finally {globalThis.document=previous;}
});
