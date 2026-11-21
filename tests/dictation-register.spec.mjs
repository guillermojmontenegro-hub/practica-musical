import {test,expect} from '@playwright/test';
import {chooseExercise} from './navigation.mjs';

test.use({hasTouch:true,viewport:{width:390,height:844}});

for(const [clef,seed,bottom] of [['Sol',0,2],['Fa',1000,-10]]) {
  test(`Do4–Do6 can be entered, edited and restored in clave de ${clef}`,async({page})=>{
    await page.goto('/');await chooseExercise(page,7);
    await page.evaluate(async seed=>{
      const {readStorage,writeCookie}=await import('/src/storage.mjs');
      writeCookie('practica-ejercicio',{...readStorage('practica-ejercicio'),seed,signature:'2/4'});
    },seed);
    await page.reload();
    await expect(page.locator('#context')).toContainText(`Clave de ${clef}`);
    await page.getByRole('button',{name:'Blanca',exact:true}).tap();
    async function tapPitch(bar,pitch) {
      const area=page.locator(`[data-staff-bar="${bar}"]`);
      const y=76-(pitch-bottom)*5-Number(await area.getAttribute('y'));
      await area.tap({position:{x:65,y}});
    }
    await tapPitch(0,0);
    const first=page.locator('[data-note-bar="0"]');
    await expect(first).toHaveAttribute('data-pitch','0');
    await first.tap();
    const panel=page.locator('#notation');
    await panel.focus();
    for(let pitch=1;pitch<=14;pitch++) {
      await page.keyboard.press('ArrowUp');
      await expect(first).toHaveAttribute('data-pitch',String(pitch));
    }
    await expect(page.getByRole('button',{name:'Subir nota'})).toBeDisabled();
    await expect(page.locator('#editor > [role=status]')).toContainText('Do6 seleccionada');
    await page.getByRole('button',{name:'Compás siguiente'}).tap();
    await tapPitch(1,14);
    await page.reload();
    await expect(panel.locator('[data-pitch="14"]')).toHaveCount(2);
    await page.locator('#next').click();
    const submitted=panel.locator('svg').first();
    await expect(submitted.locator('[data-result]')).toHaveCount(2);
    expect(await submitted.evaluate(svg=>[...svg.querySelectorAll('[data-result]')].every(mark=>
      mark.getBoundingClientRect().top>=svg.getBoundingClientRect().top))).toBe(true);
  });
}
