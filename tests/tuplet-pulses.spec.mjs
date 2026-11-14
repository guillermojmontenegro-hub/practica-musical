import {test,expect} from '@playwright/test';
import {chooseExercise,selectValue} from './navigation.mjs';
test('a rejected crossing tuplet keeps the draft and displays its reason; a smaller group fits',async({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,7);
 await selectValue(page,'#meter-choice','simple');
 const blank=page.locator('[data-staff-bar="0"]');
 await page.getByRole('button',{name:'Corchea',exact:true}).click();await blank.click({position:{x:185,y:85}});
 await page.getByRole('button',{name:'Negra',exact:true}).click();await blank.click({position:{x:185,y:85}});
 await page.locator('[data-note-bar="0"][data-note-index="1"]').click();
 const n=page.getByRole('combobox',{name:'Grupo irregular',exact:true});await selectValue(page,n,'n5');
 await expect(page.locator('[data-note-bar="0"]')).toHaveCount(2);
 await expect(page.locator('#editor > [role=status]')).toContainText('dentro de un pulso');
 await page.getByRole('button',{name:'Corchea',exact:true}).click();await selectValue(page,n,'n5');
 await expect(page.locator('[data-note-bar="0"]')).toHaveCount(6);
 await expect(page.locator('#editor > [role=status]')).toHaveAttribute('data-error','false');
});
