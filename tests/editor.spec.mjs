import { test, expect } from '@playwright/test';
import { selectValue, chooseExercise } from './navigation.mjs';
const note=(page,bar,index)=>page.locator(`[data-note-bar="${bar}"][data-note-index="${index}"]`);
async function add(page,bar,tool='1') {
 await page.getByRole('button',{name:tool==='0.5'?'Semicorchea':tool==='2'?'Negra':'Corchea',exact:true}).click();
 await page.locator(`[data-staff-bar="${bar}"]`).click({position:{x:185,y:100}});
}
test('direct editing, cross-bar ties, groups, undo and reloading preserve the draft',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,7);
 await selectValue(page,page.locator('#meter-choice'),'simple');
 const capacity=Number((await page.locator('#editor > [role=status]').textContent()).match(/de (\d+)/)[1]);
 for(let i=0;i<capacity;i++) await add(page,0);
 await page.getByRole('button',{name:'Compás siguiente',exact:true}).click();
 await add(page,1);
 const target=note(page,0,capacity-1);
 await target.click();
 await page.getByRole('button',{name:'Ligar con siguiente',exact:true}).click();
 await expect(target).toHaveAttribute('data-tie','true');
 const originalPitch=Number(await target.getAttribute('data-pitch'));
 await page.getByRole('button',{name:'Subir nota',exact:true}).click();
 await expect(target).toHaveAttribute('data-pitch',String(originalPitch+1));
 await expect(target).toHaveAttribute('data-tie','false');
 await page.getByRole('button',{name:'Deshacer',exact:true}).click();
 await expect(target).toHaveAttribute('data-tie','true');
 // Changing duration is immediate and has no separate Apply or Save controls.
 await target.click();
 await page.getByRole('button',{name:'Semicorchea',exact:true}).click();
 await expect(target).toHaveAttribute('data-length','0.5');
 await expect(target).toHaveAttribute('data-tie','false');
 await expect(page.getByRole('button',{name:'Aplicar cambios',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Deshacer',exact:true}).click();
 await expect(target).toHaveAttribute('data-tie','true');
 await page.reload();await page.locator('[data-note-bar]').first().waitFor();
 await expect(note(page,0,capacity-1)).toHaveAttribute('data-tie','true');
 // A group is inserted and its members remain individually editable in pitch.
 await page.getByRole('button',{name:'Compás siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Compás siguiente',exact:true}).click();
 await selectValue(page,page.getByRole('combobox',{name:'Grupo irregular',exact:true}),'n5');
 await page.locator('[data-staff-bar="2"]').click({position:{x:185,y:100}});
 await expect(page.locator('[data-note-bar="2"]')).toHaveCount(5);
 await note(page,2,1).click();
 const pitch=Number(await note(page,2,1).getAttribute('data-pitch'));
 await page.getByRole('button',{name:'Subir nota',exact:true}).click();
 await expect(note(page,2,1)).toHaveAttribute('data-pitch',String(pitch+1));
 await expect(page.locator('[data-note-bar="2"]')).toHaveCount(5);
 await page.getByRole('button',{name:'Eliminar grupo',exact:true}).click();
 await expect(page.locator('[data-note-bar="2"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Deshacer',exact:true}).click();
 await expect(page.locator('[data-note-bar="2"]')).toHaveCount(5);
 await page.screenshot({path:'/tmp/conservatorio-editor-compact.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('key signatures use the same direct selection, dragging and undo pattern',async ({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,4);
 await page.getByRole('button',{name:'♯ Sostenido',exact:true}).click();
 await page.locator('[data-staff-bar="0"]').first().click({position:{x:300,y:45}});
 const target=note(page,0,0);await expect(target).toBeVisible();
 await target.click();const pitch=Number(await target.getAttribute('data-pitch'));
 await page.getByRole('button',{name:'Subir nota',exact:true}).click();
 await expect(target).toHaveAttribute('data-pitch',String(pitch+1));
 await page.getByRole('button',{name:'Eliminar nota',exact:true}).click();
 await expect(target).toHaveCount(0);
 await page.getByRole('button',{name:'Deshacer',exact:true}).click();
 await expect(target).toHaveAttribute('data-pitch',String(pitch+1));
 await target.click();const bounds=await target.boundingBox();
 await page.mouse.move(bounds.x+10,bounds.y+15);await page.mouse.down();await page.mouse.move(bounds.x+10,bounds.y+5,{steps:4});await page.mouse.up();
 await expect(target).toHaveAttribute('data-pitch',String(pitch+3));
});
test('every rhythm editor offers sixteenths and 6/8 polyrhythm labels two pulses',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();
 for(const index of [7,8,9,10]) {
  await chooseExercise(page,index);
  const semi=page.getByRole('button',{name:'Semicorchea',exact:true});
  await expect(semi).toBeVisible();await expect(semi.locator('svg')).toHaveCount(1);
  await semi.click();await page.locator('[data-staff-bar="0"]').first().click({position:{x:185,y:100}});
  await expect(note(page,0,0)).toHaveAttribute('data-length','0.5');
 }
 await chooseExercise(page,9);await selectValue(page,page.locator('#meter-choice'),'compound');
 for(let i=0;i<15;i++) {
  if((await page.locator('#context').textContent()).startsWith('6/8')) break;
  await page.locator('#skip').click();
 }
 await expect(page.locator('#context')).toContainText('6/8 · 2 pulsos por compás');
 await expect(page.locator('[data-voice="2"][data-bar="0"]')).toBeVisible();
 await expect(page.locator('[data-pulse-bar="0"]')).toHaveCount(2);
 await expect(page.locator('[data-pulse-bar="0"]')).toHaveText(['1','2']);
 await page.screenshot({path:'/tmp/conservatorio-poly-68.png',fullPage:true});
 expect(errors).toEqual([]);
});
