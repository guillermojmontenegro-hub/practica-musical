import {test,expect} from '@playwright/test';
test('sampled chords have an audible output without clipping',async({page})=>{
 test.setTimeout(90000);await page.goto('/');
 const levels=await page.evaluate(async()=>{
  const {Soundfont}=await import('/node_modules/smplr/dist/index.mjs');
  const {melodicSampleOptions,sampleVelocity,instrumentOutput}=await import('/src/audio-levels.mjs');
  const results=[];
  for(const [id,instrument] of Object.entries({piano:'acoustic_grand_piano',guitar:'acoustic_guitar_nylon',flute:'flute',clarinet:'clarinet',marimba:'marimba'})){
   const context=new OfflineAudioContext(1,48000,48000);
   const player=Soundfont(context,{instrument,kit:'FluidR3_GM',destination:instrumentOutput(context),...melodicSampleOptions(id),notesToLoad:{notes:[60,64,67]}});await player.ready;
   for(const note of [60,64,67])player.start({note,time:.02,duration:.7,velocity:sampleVelocity(.095)});
   const rendered=await context.startRendering(),samples=rendered.getChannelData(0).slice(2400,33600);
   const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),peak=samples.reduce((max,n)=>Math.max(max,Math.abs(n)),0);
   results.push({instrument,rms,peak});player.dispose();
  }
  return results;
 });
 expect(levels).toHaveLength(5);
 for(const {instrument,rms,peak} of levels){expect(rms,instrument).toBeGreaterThan(.045);expect(peak,instrument).toBeLessThan(.98);}
});

test('snare and cymbal have matching attack levels and headroom',async({page})=>{
 await page.goto('/');
 const levels=await page.evaluate(async()=>{
  const {Sampler}=await import('/node_modules/smplr/dist/index.mjs');
  const {percussionOutput,instrumentOutput,sampleVelocity}=await import('/src/audio-levels.mjs');
  const levels=[];
  for(const instrument of ['snare','cymbal']){
   const context=new OfflineAudioContext(1,24000,48000);
   const player=Sampler(context,{destination:percussionOutput(context,instrument,instrumentOutput(context)),detune:0,lpfCutoffHz:20000,decayTime:.025,volume:100,buffers:{C4:`/sounds/${instrument}.m4a`}});await player.ready;
   player.start({note:60,time:.02,duration:.3,velocity:sampleVelocity(.19,true)});
   const audio=await context.startRendering(),samples=audio.getChannelData(0).slice(960,6720);
   const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),peak=samples.reduce((max,n)=>Math.max(max,Math.abs(n)),0);
   levels.push({rms,peak});player.dispose();
  }
  return levels;
 });
 expect(Math.abs(20*Math.log10(levels[0].rms/levels[1].rms))).toBeLessThan(1);
 levels.forEach(({rms,peak})=>{expect(rms).toBeGreaterThan(.04);expect(peak).toBeLessThan(.98);});
});
