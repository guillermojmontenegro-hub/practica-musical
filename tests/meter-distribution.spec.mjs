import {test,expect} from '@playwright/test';
import {chooseExercise,selectValue} from './navigation.mjs';

const currentMeter=async page=>(await page.locator('#context').innerText()).match(/\b\d+\/[48]\b/)[0];

test('mixed practice distributes all five meters across exercises, reloads and filter changes',async({page})=>{
  await page.goto('/');
  await chooseExercise(page,7);
  for(let round=0;round<3;round++) {
    const signatures=[];
    for(let index=0;index<5;index++) {
      if(index===3&&round===0) {
        await selectValue(page,'#meter-choice','simple');
        const simple=[await currentMeter(page)];
        await chooseExercise(page,8);
        simple.push(await currentMeter(page));
        await page.locator('#skip').click();
        simple.push(await currentMeter(page));
        expect(simple.sort()).toEqual(['2/4','3/4','4/4']);
        await selectValue(page,'#meter-choice','compound');
        const first=await currentMeter(page);
        await page.locator('#skip').click();
        expect([first,await currentMeter(page)].sort()).toEqual(['6/8','9/8']);
        await selectValue(page,'#meter-choice','mixed');
      } else if(index||round) await page.locator('#skip').click();
      signatures.push(await currentMeter(page));
      if(index===1) {
        await page.reload();
        expect(await currentMeter(page)).toBe(signatures[index]);
      }
    }
    expect(signatures.map(signature=>signature.split('/')[1])).toEqual(['4','8','4','8','4']);
    expect(signatures.sort()).toEqual(['2/4','3/4','4/4','6/8','9/8']);
  }
});
