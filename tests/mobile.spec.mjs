import { selectValue, openSidebar, navigate, chooseExercise } from './navigation.mjs';
import { test, expect } from '@playwright/test';

test.use({isMobile:true,hasTouch:true});
async function choose(page,index) {
 await chooseExercise(page,index,true);
 await expect(page.locator('#app-sidebar')).toBeHidden();
}
async function fits(page) {
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
for(const width of [320,390,430,844]) {
 test(`touch workflows fit a ${width}px phone viewport`,async ({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:width===844?390:844});
  await page.goto('/');
  await page.locator('.tab').first().waitFor({state:'attached'});
  await expect(page.locator('.card')).toBeVisible();
  await fits(page);
  // Traverse every exercise with real touch events, including long titles and scores.
  for(let index=0;index<12;index++) {
   await choose(page,index);
   await fits(page);
   await expect(page.locator('#title')).not.toBeEmpty();
  }
  await choose(page,0);
  await page.locator('#play').tap();
  await expect(page.locator('#play')).toHaveAttribute('aria-label','Detener audio');
  await page.locator('#play').tap();
  await expect(page.locator('#play')).toHaveAttribute('aria-label','Reproducir audio');
  // Write, change pitch, undo and navigate a long score without a keyboard.
  await choose(page,7);
  await page.getByRole('button',{name:'Corchea',exact:true}).tap();
  const blank=page.locator('[data-staff-bar="0"]');
  await blank.tap({position:{x:180,y:100}});
  await expect(page.locator('#editor > [role=status]')).toContainText('1 de');
  const note=page.locator('[data-note-bar="0"][data-note-index="0"]');
  await note.tap();
  await expect(page.locator('[data-note-bar="0"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Subir nota',exact:true}).tap();
  await expect(page.locator('#editor > [role=status]')).toContainText('seleccionada');
  await page.getByRole('button',{name:'Semicorchea',exact:true}).tap();
  await expect(note).toHaveAttribute('data-length','0.5');
  await page.getByRole('button',{name:'Deshacer',exact:true}).tap();
  await expect(note).toHaveAttribute('data-length','1');
  await page.getByRole('button',{name:'Compás siguiente',exact:true}).tap();
  await expect(page.locator('.score-position')).toHaveText('Compás 2 de 4');
  expect(await page.locator('#notation').evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
  await page.locator('[data-staff-bar="1"]').tap({position:{x:180,y:100}});
  await expect(page.locator('#editor > [role=status]')).toContainText('Compás 2 · 0.5 de');
  await fits(page);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`/tmp/conservatorio-touch-${width}.png`,fullPage:true,animations:'disabled'});
  // Settings expand and keep large inputs inside the viewport.
  await openSidebar(page);
  await page.locator('.sound-settings > summary').tap();
  await page.locator('#tempo').fill('100');
  await page.locator('#tempo').dispatchEvent('change');
  await expect(page.locator('#tempo')).toHaveValue('100');
  await page.locator('.sound-settings details > summary').tap();
  await page.locator('#metro-toggle').tap();
  await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#metro-toggle').tap();
  await expect(page.locator('#metro-toggle')).toHaveAttribute('aria-pressed','false');
  await fits(page);
  await page.locator('.guided-settings > summary').tap();
  await page.locator('#start').tap();
  await expect(page.locator('#pause-session')).toBeVisible();
  await page.locator('#pause-session').tap();
  await expect(page.locator('#pause-session')).toHaveText('Reanudar');
  await page.locator('#finish').tap();
  // Theme, filters and chart work by touch; returning preserves the mounted app.
  await navigate(page,'Estadísticas');
  await selectValue(page,page.getByRole('combobox',{name:'Período',exact:true}),'90');
  await page.getByRole('button',{name:'Activar modo oscuro',exact:true}).tap();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const lastDay=page.locator('.day-bar').last();
  await lastDay.tap();
  await expect(page.locator('.chart-detail')).toContainText('intentos');
  await fits(page);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`/tmp/conservatorio-stats-touch-${width}.png`,fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);
 });
}
