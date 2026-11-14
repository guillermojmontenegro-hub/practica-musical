import { test, expect } from '@playwright/test';
import { chooseExercise, selectValue } from './navigation.mjs';
test('both rhythmic voices start empty and must be completed independently',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,9);
 await selectValue(page,'#meter-choice','simple');
 await expect(page.locator('[data-note-index]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Voz 2',exact:true})).toBeVisible();
 const capacity=Number((await page.locator('#editor > [role=status]').textContent()).match(/de (\d+)/)[1]);
 expect(await page.locator('.score-toolbar [data-tool]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tool))).toEqual(['8','4','2','1','0.5','0.25']);
 for(let voice=0;voice<2;voice++){
  await page.getByRole('button',{name:`Voz ${voice+1}`,exact:true}).click();
  if(voice)await page.getByRole('button',{name:'Compás anterior',exact:true}).click();
  for(let bar=0;bar<2;bar++){
   if(bar)await page.getByRole('button',{name:'Compás siguiente',exact:true}).click();
   await page.getByRole('button',{name:'Negra',exact:true}).click();
   await page.locator('#notation').focus();for(let i=0;i<capacity/2;i++)await page.keyboard.press('Enter');
  }
  if(!voice)await expect(page.locator('#next')).toBeDisabled();
 }
 await expect(page.locator('#next')).toBeEnabled();
 expect(await page.locator('[data-note-voice="0"]').count()).toBe(capacity);
 expect(await page.locator('[data-note-voice="1"]').count()).toBe(capacity);
 await page.reload();await page.locator('[data-note-index]').first().waitFor();await expect(page.locator('#next')).toBeEnabled();
 await page.locator('#next').click();await expect(page.locator('#notation svg')).toHaveCount(2);
 await expect(page.locator('#notation [data-voice="2"]')).toHaveCount(4);
 expect(errors).toEqual([]);
});
test('duration, dot, tuplet and tie are independent controls',async ({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,7);
 await page.getByRole('button',{name:'Corchea',exact:true}).click();await page.getByRole('button',{name:'Puntillo',exact:true}).click();
 await page.locator('[data-staff-bar="0"]').click({position:{x:185,y:100}});
 const first=page.locator('[data-note-bar="0"][data-note-index="0"]');
 await expect(first).toHaveAttribute('data-length','1.5');await first.click();
 await page.getByRole('button',{name:'Puntillo',exact:true}).click();await expect(first).toHaveAttribute('data-length','1');
 await selectValue(page,page.getByRole('combobox',{name:'Grupo irregular',exact:true}),'n3');
 await expect(page.locator('[data-note-bar="0"]')).toHaveCount(3);
 const total=await page.locator('[data-note-bar="0"]').evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+Number(node.dataset.length),0));expect(total).toBeCloseTo(1);
 await selectValue(page,page.getByRole('combobox',{name:'Grupo irregular',exact:true}),'');
 await expect(page.locator('[data-note-bar="0"]')).toHaveCount(1);await expect(first).toHaveAttribute('data-length','1');
});
