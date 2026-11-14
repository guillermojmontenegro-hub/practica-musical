import { test, expect } from '@playwright/test';
test('all sampled melodic and percussion instruments load and schedule buffers rather than oscillators',async ({page})=>{
 test.setTimeout(90000);
 await page.goto('/');await page.locator('#play').waitFor();
 const result=await page.evaluate(async()=>{
  const engine=await import('/src/audio.mjs');await engine.unlockAudio();
  const output=[];
  for(const instrument of ['piano','guitar','flute','clarinet','marimba','kick','cymbal']){
   const loaded=await engine.prepareExerciseAudio([[60,0,.2,.16,instrument]],{instrument});
   let buffers=0,oscillators=0;
   const bp=AudioContext.prototype.createBufferSource,op=AudioContext.prototype.createOscillator;
   AudioContext.prototype.createBufferSource=function(...args){buffers++;return bp.apply(this,args);};
   AudioContext.prototype.createOscillator=function(...args){oscillators++;return op.apply(this,args);};
   try{
    engine.playExercise([[60,0,.2,.16,instrument]],{instrument,bpm:90},()=>{});
    await new Promise(resolve=>setTimeout(resolve,130));engine.stopExerciseAudio();
    output.push({instrument,loaded,buffers,oscillators});
   }finally{AudioContext.prototype.createBufferSource=bp;AudioContext.prototype.createOscillator=op;}
  }
  return output;
 });
 for(const item of result){expect(item.loaded,item.instrument).toBe(true);expect(item.buffers,item.instrument).toBeGreaterThan(0);expect(item.oscillators,item.instrument).toBe(0);}
});
