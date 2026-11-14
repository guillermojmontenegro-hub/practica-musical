import assert from 'node:assert/strict';
import { test } from '@playwright/test';
test('all exercises render and a transcription compares with its reference',async ({ page })=>{
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
await page.goto('http://localhost:5173');
await page.locator('.tab').first().waitFor();
for(let index=0;index<12;index++) {
 await page.locator('.tab').nth(index).click();
 assert.equal(await page.locator('.tab').nth(index).getAttribute('aria-pressed'),'true');
 for(let n=0;n<8;n++) {
  await page.locator('#skip').click();
  if (await page.locator('#notation').isVisible()) {
   await page.locator('#notation svg').first().waitFor();
  }
 }
 console.log(index,await page.locator('#title').textContent());
}
await page.locator('.tab').nth(7).click();
await page.locator('#notation').focus();
await page.keyboard.press('Enter');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('Enter');
await page.getByRole('button',{name:'Corchea',exact:true}).click();
for(let bar=0;bar<4;bar++) {
 await page.locator('#notation').focus();
 if(bar>0) await page.keyboard.press('ArrowRight');
 for(let n=0;n<9;n++) await page.keyboard.press('Enter');
}
assert.equal(await page.locator('#next').isEnabled(),true);
await page.locator('#next').click();
assert.equal(await page.locator('#notation svg').count(),2);
await page.screenshot({path:'/tmp/conservatorio-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'/tmp/conservatorio-mobile.png',fullPage:true});
console.log('ERRORS',JSON.stringify(errors));
assert.deepEqual(errors,[]);
});
