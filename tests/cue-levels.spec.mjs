import {test,expect} from '@playwright/test';
// Renders the standalone metronome and the Pomodoro alarm through the app's own audio path
// in an OfflineAudioContext, so cue levels stay measurable instead of only listened to.
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
test('the metronome and the alarm are audible over the output bus without clipping',async({page})=>{
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
 expect(clickLevels.beat.rms,`metronome beat RMS ${clickLevels.beat.rms.toFixed(4)}`).toBeGreaterThan(.013);
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
});
