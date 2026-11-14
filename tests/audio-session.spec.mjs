import {test,expect} from '@playwright/test';
import {openSidebar} from './navigation.mjs';
test('exercise, metronome and alarm replace each other and update their controls',async({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await openSidebar(page);
 await page.locator('.sound-settings > summary').click();await page.locator('.sound-settings details > summary').click();
 await page.locator('#metro-toggle').click();await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#playStatus')).toHaveText('Reproduciendo…',{timeout:16000});
 await page.locator('#metro-toggle').click();await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
 await page.locator('.guided-settings > summary').click();await page.getByRole('button',{name:'Probar alarma',exact:true}).click();
 await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#play').click();await expect(page.locator('#playStatus')).toHaveText('Reproduciendo…');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.getByRole('button',{name:'Probar alarma',exact:true}).click();await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
 expect(errors).toEqual([]);
});

test('a cancelled instrument load cannot resume after another source has started',async({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await openSidebar(page);
 await page.route('**/midi-js-soundfonts/**',async route=>{await new Promise(resolve=>setTimeout(resolve,1000));try{await route.continue();}catch{}});
 await page.locator('#play').click();await expect(page.locator('#playStatus')).toHaveText('Cargando instrumento…');
 await page.locator('.sound-settings > summary').click();await page.locator('.sound-settings details > summary').click();await page.locator('#metro-toggle').click();
 await page.waitForTimeout(1800);
 await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
});

test('interrupting sampled playback cancels later notes in the sequencer too',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const engine=await import('/src/audio.mjs');await engine.unlockAudio();
  const events=[[60,0,.3,.16],[64,1,.3,.16],[67,2,.3,.16]];
  await engine.prepareExerciseAudio(events,{instrument:'piano'});
  const original=AudioContext.prototype.createBufferSource;let buffers=0;
  AudioContext.prototype.createBufferSource=function(...args){buffers++;return original.apply(this,args);};
  try{
   engine.playExercise(events,{instrument:'piano',bpm:180},()=>{});
   await new Promise(resolve=>setTimeout(resolve,90));
   const track=engine.newClickTrack(),before=buffers;
   await new Promise(resolve=>setTimeout(resolve,850));track.stop();return {before,after:buffers};
  }finally{AudioContext.prototype.createBufferSource=original;engine.stopExerciseAudio();}
 });
 expect(result.before).toBeGreaterThan(0);expect(result.after).toBe(result.before);
});
