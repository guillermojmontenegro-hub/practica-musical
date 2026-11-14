import { test, expect } from '@playwright/test';
import { chooseExercise, selectValue } from './navigation.mjs';

test('all rhythm editors modify the selected duration with n2–n5 in either voice and meter',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();
 for(const mode of [8,9,10])for(const family of ['simple','compound']){
  await chooseExercise(page,mode);await selectValue(page,'#meter-choice',family);
  if(mode!==9)await selectValue(page,'#rhythm-pitches','2');
  const modifier=page.getByRole('combobox',{name:'Grupo irregular',exact:true});
  await expect(modifier).toBeVisible();
  for(const voice of [0,1]){
   await page.getByRole('button',{name:`Voz ${voice+1}`,exact:true}).click();
   await selectValue(page,modifier,'');
   await page.getByRole('button',{name:'Negra',exact:true}).click();
   await page.locator(`[data-staff-bar="0"][data-staff-voice="${voice}"]`).click({position:{x:185,y:85}});
   const notes=page.locator(`[data-note-bar="0"][data-note-voice="${voice}"]`);
   await notes.first().click();
   for(const size of [2,3,4,5]){
    await selectValue(page,modifier,`n${size}`);
    await expect(notes).toHaveCount(size);
    const duration=await notes.evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+Number(node.dataset.length),0));
    expect(duration).toBeCloseTo(2);
    await expect(page.getByRole('button',{name:'Negra',exact:true})).toHaveAttribute('aria-pressed','true');
   }
   await selectValue(page,modifier,'');
   await expect(notes).toHaveCount(1);await expect(notes.first()).toHaveAttribute('data-length','2');
  }
 }
 expect(errors).toEqual([]);
});

test('rest is a shared modifier for every duration and persists in both voices',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,9);
 for(const voice of [0,1]){
  await page.getByRole('button',{name:`Voz ${voice+1}`,exact:true}).click();
  await page.getByRole('button',{name:'Fusa',exact:true}).click();
  if(await page.getByRole('button',{name:'Silencio',exact:true}).getAttribute('aria-pressed')!=='true') await page.getByRole('button',{name:'Silencio',exact:true}).click();
  await page.locator(`[data-staff-bar="0"][data-staff-voice="${voice}"]`).click({position:{x:185,y:85}});
  const first=page.locator(`[data-note-bar="0"][data-note-voice="${voice}"][data-note-index="0"]`);
  await expect(first).toHaveAttribute('data-rest','true');await first.click();
  await page.getByRole('button',{name:'Puntillo',exact:true}).click();await expect(first).toHaveAttribute('data-length','0.375');
  await selectValue(page,page.getByRole('combobox',{name:'Grupo irregular',exact:true}),'n3');
  await expect(page.locator(`[data-note-voice="${voice}"][data-rest="true"]`)).toHaveCount(3);
  await selectValue(page,page.getByRole('combobox',{name:'Grupo irregular',exact:true}),'');
  await page.getByRole('button',{name:'Puntillo',exact:true}).click();
  for(const name of ['Semicorchea','Corchea','Negra','Blanca']){
   await page.getByRole('button',{name,exact:true}).click();await expect(first).toHaveAttribute('data-rest','true');
  }
  await page.getByRole('button',{name:'Silencio',exact:true}).click();await expect(first).toHaveAttribute('data-rest','false');
  await page.getByRole('button',{name:'Silencio',exact:true}).click();await expect(first).toHaveAttribute('data-rest','true');
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();await expect(first).toHaveAttribute('data-rest','false');
 }
 await page.reload();await page.locator('[data-note-index]').first().waitFor();
 await expect(page.locator('[data-note-voice="0"]')).toHaveAttribute('data-length','4');
 await expect(page.locator('[data-note-voice="1"]')).toHaveAttribute('data-length','4');
 await page.screenshot({path:'/tmp/conservatorio-rest-editor.png',fullPage:true});expect(errors).toEqual([]);
});
