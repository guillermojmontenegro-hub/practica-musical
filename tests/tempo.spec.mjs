import {test,expect} from '@playwright/test';
test('sampled onsets keep the requested BPM in simple and compound meters',async({page})=>{
 test.setTimeout(45000);await page.goto('/');
 const results=await page.evaluate(async()=>{
  const engine=await import('/src/audio.mjs'),{melodyEvents}=await import('/src/melody-patterns.mjs'),{tupletNotes}=await import('/src/score-model.mjs');
  await engine.unlockAudio();await engine.prepareExerciseAudio([[60,0,.1,.16]],{instrument:'piano'});
  const results=[],original=AudioBufferSourceNode.prototype.start;
  for(const unit of [2,3])for(const bpm of [60,120]){
   const starts=[];AudioBufferSourceNode.prototype.start=function(time,...args){starts.push(time);return original.call(this,time,...args);};
   const notes=[...tupletNotes(5,unit,0,1),{pitch:0,length:unit/2},{pitch:0,length:unit/2}];
   try{
    engine.playExercise(melodyEvents([notes],{beats:2,unit},0),{instrument:'piano',bpm},()=>{});
    await new Promise(resolve=>setTimeout(resolve,2*60/bpm*1000+180));
    results.push({unit,bpm,onsets:starts.map(time=>time-starts[0])});
   }finally{engine.stopExerciseAudio();AudioBufferSourceNode.prototype.start=original;}
  }
  return results;
 });
 for(const {bpm,onsets} of results){
  expect(onsets).toHaveLength(7);
  [0,.2,.4,.6,.8,1,1.5].forEach((beat,index)=>expect(onsets[index]).toBeCloseTo(beat*60/bpm,4));
 }
});

test('tempo units are explicit and the compound metronome keeps its pulse when subdividing',async({page})=>{
 const {chooseExercise,selectValue,openSidebar}=await import('./navigation.mjs');
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,8);
 await selectValue(page,'#meter-choice','compound');await expect(page.locator('#sound-playing')).toContainText('negra con puntillo');
 await selectValue(page,'#meter-choice','simple');await expect(page.locator('#tempo-unit')).toHaveText('negra');
 await openSidebar(page);await page.locator('.sound-settings > summary').click();await page.locator('.sound-settings details > summary').click();
 await selectValue(page,'#metro-meter','6/8');await expect(page.locator('#metro-unit')).toHaveText('negra con puntillo');
 await page.locator('#metro-tempo').fill('60');await page.locator('#metro-tempo').dispatchEvent('change');
 await page.evaluate(()=>{
  window.tempoStarts=[];const original=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(time,...args){window.tempoStarts.push(time);return original.call(this,time,...args);};
 });
 for(const subdivided of [false,true]){
  await page.locator('#metro-subdivision').setChecked(subdivided);
  await page.evaluate(()=>{window.tempoStarts=[];});await page.locator('#metro-toggle').click();
  await page.waitForFunction(()=>new Set(window.tempoStarts).size>=3);
  const times=await page.evaluate(()=>[...new Set(window.tempoStarts)]);await page.locator('#metro-toggle').click();
  expect(times[1]-times[0]).toBeCloseTo(subdivided?1/3:1,5);
  expect(times[2]-times[0]).toBeCloseTo(subdivided?2/3:2,5);
 }
});

test('score playback keeps notes on time while the interface is busy',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const engine=await import('/src/audio.mjs');
  await engine.unlockAudio();
  const loaded=await engine.prepareExerciseAudio([[60,0,.1,.16]],{instrument:'piano'});
  const starts=[],original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(time,...args){
   starts.push({time,now:this.context.currentTime});return original.call(this,time,...args);
  };
  try {
   const events=Array.from({length:12},(_,i)=>[60+i%5,i*.25,.2,.16]);
   engine.playExercise(events,{instrument:'piano',bpm:120},()=>{});
   // A render or background-tab timer delay must not bunch later notes together.
   const until=performance.now()+700;
   while(performance.now()<until){}
   await new Promise(resolve=>setTimeout(resolve,1600));
   return {loaded,starts};
  } finally {engine.stopExerciseAudio();AudioBufferSourceNode.prototype.start=original;}
 });
 expect(result.loaded).toBe(true);
 expect(result.starts).toHaveLength(12);
 for(const {time,now} of result.starts)expect(time-now,'notes must be scheduled before their audio deadline').toBeGreaterThanOrEqual(0);
});

test('stopping a pre-scheduled score cancels notes before their future onset',async({page})=>{
 await page.goto('/');
 const records=await page.evaluate(async()=>{
  const engine=await import('/src/audio.mjs');await engine.unlockAudio();
  await engine.prepareExerciseAudio([[60,0,.1,.16]],{instrument:'piano'});
  const records=[],original=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(...args){
   const source=original.apply(this,args),record={};records.push(record);
   const start=source.start.bind(source),stop=source.stop.bind(source);
   source.start=(time,...args)=>{record.start=time;return start(time,...args);};
   source.stop=time=>{record.stop=time??this.currentTime;return stop(time);};
   return source;
  };
  try {
   engine.playExercise([[60,1,.3,.16],[64,2,.3,.16],[67,3,.3,.16]],{instrument:'piano',bpm:60},()=>{});
   engine.stopExerciseAudio();return records;
  } finally {AudioContext.prototype.createBufferSource=original;engine.stopExerciseAudio();}
 });
 expect(records).toHaveLength(3);
 records.forEach(record=>expect(record.stop).toBeLessThan(record.start));
});
