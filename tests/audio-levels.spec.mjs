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
