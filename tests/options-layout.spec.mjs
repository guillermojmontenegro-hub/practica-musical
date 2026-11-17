import {test,expect} from '@playwright/test';
import {chooseExercise,selectValue} from './navigation.mjs';
test.use({hasTouch:true});

for(const width of [320,390,1440])test(`all exercise options align at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await page.locator('.tab').first().waitFor({state:'attached'});
  const count=await page.locator('.tab').count();
  expect(count).toBe(13);
  for(let index=0;index<count;index++) {
    await chooseExercise(page,index,width<901);
    if(width<901)await expect(page.locator('#app-sidebar')).toBeHidden();
    const controls=page.locator('.exercise-options button[role=combobox]:visible, .exercise-toggles label:visible');
    const bounds=await controls.evaluateAll(nodes=>nodes.map(node=>{
      const rect=node.getBoundingClientRect();
      return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom};
    }));
    for(const rect of bounds) {
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x+rect.width).toBeLessThanOrEqual(width);
    }
    if(width===1440 && bounds.length>1)for(const rect of bounds)expect(Math.abs(rect.bottom-bounds[0].bottom)).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const answers=page.locator('#editor [role=combobox]');
    for(const input of await answers.all())expect((await input.boundingBox()).height).toBe(44);
    if([3,8,11,12].includes(index) && width!==320) {
      if(index===12)await selectValue(page,'#progression-count','8');
      await page.screenshot({path:`/tmp/options-${width}-${index}.png`,fullPage:true,animations:'disabled'});
    }
  }
  await page.getByRole('button',{name:'Activar modo oscuro',exact:true}).click();
  await page.screenshot({path:`/tmp/options-${width}-dark.png`,fullPage:true,animations:'disabled'});
});
