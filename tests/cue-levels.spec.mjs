import {test,expect} from '@playwright/test';
// Renders the standalone metronome, the Pomodoro alarm and the exercise count-in through the
// app's own audio path in an OfflineAudioContext, so cue levels stay measurable instead of only listened to.
const harness=`
  window.__context=new OfflineAudioContext(1,240000,48000);window.__fakeTime=0;
  const facade=new Proxy(window.__context,{get(target,property){
    if(property==='state')return 'running';
    if(property==='resume')return async()=>{};
    if(property==='currentTime')return window.__fakeTime;
    const value=target[property];
    return typeof value==='function'?value.bind(target):value;
  },set(target,property,value){target[property]=value;return true;}});
  window.AudioContext=function(){return facade;};
  window.__window=(from,to)=>{const data=window.__rendered.getChannelData(0).slice(from*48,to*48);
    return {rms:Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length),peak:data.reduce((max,n)=>Math.max(max,Math.abs(n)),0)};};
`;
test('the metronome, the alarm and the count-in click are audible over the output bus without clipping',async({page})=>{
 test.setTimeout(60000);
 const clickLevels=await (async()=>{
  await page.goto('/');
  return page.evaluate(async code=>{
   eval(code);
   const engine=await import('/src/audio.mjs'),{metronomeLevels}=await import('/src/audio-levels.mjs');
   await engine.unlockAudio();
   const track=engine.newClickTrack();
   track.click(.05,87,metronomeLevels.beat);track.click(.55,79,metronomeLevels.beat);track.click(1.05,73,metronomeLevels.subdivision);
   window.__rendered=await window.__context.startRendering();
   return {beat:window.__window(500,700),subdivision:window.__window(1000,1200),peak:window.__window(0,1500).peak};
  },harness);
 })();
 expect(clickLevels.beat.rms,`metronome beat RMS ${clickLevels.beat.rms.toFixed(4)}`).toBeGreaterThan(.028);
 expect(clickLevels.beat.peak).toBeLessThan(.98);
 expect(clickLevels.subdivision.rms/clickLevels.beat.rms).toBeCloseTo(.5,1);
 const alarm=await (async()=>{
  await page.goto('/');
  return page.evaluate(async code=>{
   eval(code);
   const engine=await import('/src/audio.mjs');
   await engine.unlockAudio();
   window.__fakeTime=2;engine.ring();
   window.__rendered=await window.__context.startRendering();
   return window.__window(2000,2800);
  },harness);
 })();
 expect(alarm.rms,`alarm RMS ${alarm.rms.toFixed(4)}`).toBeGreaterThan(.055);
 expect(alarm.peak).toBeLessThan(.98);
 // The count-in click is rendered through the real exercise path (playExercise) at 90 BPM,
 // and against the previous .13 level so the increase stays measurable.
 const renderCounter=async factor=>{
   await page.goto('/');
   return page.evaluate(async ({code,factor})=>{
     eval(code);
     const engine=await import('/src/audio.mjs'),{countIn}=await import('/src/music.mjs');
     await engine.unlockAudio();
     const events=countIn({top:4,bottom:4,beats:4,unit:2}).map(([note,offset,duration,volume,voice])=>[note,offset,duration,volume*factor,voice]);
     engine.playExercise(events,{instrument:'piano',bpm:90},()=>{});
     window.__rendered=await window.__context.startRendering();
     return {first:window.__window(30,140),last:window.__window(2030,2140),peak:window.__window(0,3000).peak};
   },{code:harness,factor});
 };
 const counter=await renderCounter(1);
 const previousCounter=await renderCounter(.13/.39);
 expect(counter.first.rms,`count-in RMS ${counter.first.rms.toFixed(4)}`).toBeGreaterThan(.028);
 expect(counter.last.rms,`count-in last click RMS ${counter.last.rms.toFixed(4)}`).toBeGreaterThan(.028);
 expect(counter.first.rms/previousCounter.first.rms,`count-in increase ${counter.first.rms/previousCounter.first.rms}x the previous level`).toBeGreaterThan(2.7);
 expect(counter.peak).toBeLessThan(.98);
 console.info('measured cue levels',JSON.stringify({beat:clickLevels.beat,subdivision:clickLevels.subdivision,alarm,countIn:counter,previousCountIn:previousCounter}));
});
