import { test, expect } from '@playwright/test';
import { chooseExercise, selectValue } from './navigation.mjs';

test('solfege controls persist and both clefs render as a single melody across two staves',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();
 for(const index of [5,6]) {
  await chooseExercise(page,index);
  await expect(page.locator('#sight-clef-label')).toBeVisible();
  for(const clef of ['sol','fa','both']) {
   await selectValue(page,'#sight-clef',clef);
   for(const difficulty of ['beginner','intermediate','advanced']) {
    await selectValue(page,'#sight-difficulty',difficulty);
    await expect(page.locator('#notation svg')).toHaveCount(1);
    if(clef==='both') {
     await expect(page.locator('[data-clef="sol"]')).toHaveCount(index===6&&difficulty==='beginner'?2:4);
     await expect(page.locator('[data-clef="fa"]')).toHaveCount(index===6&&difficulty==='beginner'?2:4);
    }
   }
  }
 }
 await page.reload();await expect(page.locator('#sight-clef')).toHaveValue('both');
 await expect(page.locator('#sight-difficulty')).toHaveValue('advanced');
 await expect(page.locator('#listen-melody')).toBeVisible();
 await page.locator('#notation').screenshot({path:'/tmp/conservatorio-solfege-both.png'});
 await chooseExercise(page,7);await expect(page.locator('#sight-clef-label')).toBeHidden();
 expect(errors).toEqual([]);
});
