import { test, expect } from '@playwright/test';
import { openSidebar } from './navigation.mjs';

test('Pomodoro stops at zero and preserves the whole exercise until the user finishes',async ({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('.tab').first().waitFor();
 await openSidebar(page);await page.locator('.guided-settings > summary').click();
 await page.locator('#minutes').fill('1');await page.locator('#chair-minutes').fill('1');await page.locator('#rest-minutes').fill('0');
 await page.locator('#pool > summary').click();
 for(const checkbox of await page.locator('#practice-types input').all())await checkbox.uncheck();await page.locator('#practice-types input').first().check();
 await page.locator('#start').click();
 const exercise=await page.locator('#title').textContent();const answers=await page.locator('#answers').textContent();
 await page.clock.fastForward(61000);
 await expect(page.locator('#clock')).toHaveText('00:00');await expect(page.locator('#exercise-layout')).toBeVisible();
 await expect(page.locator('#title')).toHaveText(exercise);await expect(page.locator('#answers')).toHaveText(answers);
 await expect(page.locator('#pause-session')).toBeDisabled();
 await page.clock.fastForward(60000);await expect(page.locator('#clock')).toHaveText('00:00');
 await page.reload();await page.locator('.tab').first().waitFor();await expect(page.locator('#clock')).toHaveText('00:00');
 await expect(page.locator('#exercise-layout')).toBeVisible();await expect(page.locator('#title')).toHaveText(exercise);
 // Complete every step, including seeing the correction, before moving on.
 for(let step=0;step<4;step++){
  if(!await page.locator('#exercise-layout').isVisible())break;
  const option=page.locator('#answers button:enabled').first();if(await option.count())await option.click();
  await page.locator('#next').click();
 }
 await expect(page.locator('#phase-title')).toHaveText('Ejercicios de la cátedra');await expect(page.locator('#exercise-layout')).toBeHidden();
 await expect(page.locator('#clock')).not.toHaveText('00:00');
});
