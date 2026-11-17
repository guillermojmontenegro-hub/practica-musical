import {test,expect} from '@playwright/test';
import {openSidebar} from './navigation.mjs';
test('the play control turns into a pause control while audio is running',async({page})=>{
 await page.goto('/');const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('#play').waitFor();
 await expect(page.locator('#play .icon-play')).toBeVisible();
 await expect(page.locator('#play .icon-pause')).toBeHidden();
 await page.locator('#play').click();
 await expect(page.locator('#playStatus')).toHaveText('Reproduciendo…',{timeout:16000});
 await expect(page.locator('#play')).toHaveAttribute('aria-label','Pausar audio');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play .icon-pause')).toBeVisible();
 await expect(page.locator('#play .icon-play')).toBeHidden();
 await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#play .icon-play')).toBeVisible();
 // Another audio source taking over the session has to restore the play control too.
 await page.locator('#play').click();
 await expect(page.locator('#playStatus')).toHaveText('Reproduciendo…');
 await openSidebar(page);
 await page.locator('.sound-settings > summary').click();await page.locator('.sound-settings details > summary').click();
 await page.locator('#metro-toggle').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
 await expect(page.locator('#play .icon-play')).toBeVisible();
 await expect(page.locator('#play .icon-pause')).toBeHidden();
 expect(errors).toEqual([]);
});
