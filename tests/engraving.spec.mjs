import { test, expect } from '@playwright/test';
import { chooseExercise } from './navigation.mjs';

test('canonical group figures and labels render without ratios, and both voices align to pulse onsets',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();
 await page.evaluate(async()=>{
  const {setNotation}=await import('/src/notation.mjs'),{tupletNotes}=await import('/src/score-model.mjs');
  const main=[
   [...tupletNotes(4,3,-7,1),{pitch:-7,length:1},{pitch:-6,length:2}],
   [...tupletNotes(2,3,-5,2),{pitch:-5,length:1},{pitch:-7,length:2,tie:true}],
   [{pitch:-7,length:2},...tupletNotes(3,2,-6,3),...tupletNotes(5,2,-7,4)]
  ];
  const secondary=main.map(()=>Array.from({length:3},()=>[{pitch:4,length:1},{pitch:4,length:1}]).flat());
  document.getElementById('notation').hidden=false;
  setNotation({clef:'fa',meter:{top:3,bottom:4,beats:3,unit:2},measures:main,secondaryMeasures:secondary,edit:true,editNotes:true,active:0,label:'Auditoría de notación'});
  document.getElementById('notation').scrollLeft=0;
 });
 await expect(page.locator('[data-tuplet-size="4"]')).toHaveAttribute('data-tuplet-occupied','3');
 expect(await page.locator('[data-tuplet-label]').evaluateAll(nodes=>nodes.every(node=>/^[2345]$/.test(node.dataset.tupletLabel)))).toBe(true);
 await expect(page.locator('[data-tie-voice="0"][data-tie-bar="1"]')).toHaveCount(1);
 const beatXs=await page.locator('[data-pulse-bar="0"]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('x'))));
 const voiceXs=await page.locator('[data-note-voice="1"][data-note-bar="0"]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('x'))+11));
 beatXs.forEach((x,index)=>expect(x).toBeCloseTo(voiceXs[index*2],1));
 await page.locator('#notation').screenshot({path:'/tmp/conservatorio-notation-audit.png'});
 expect(errors).toEqual([]);
});

test('a new reading exercise starts at the clef, and comparison barlines use the same width',async ({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,5);
 await page.locator('#notation').evaluate(node=>{node.scrollLeft=node.scrollWidth;});
 expect(await page.locator('#notation').evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
 await page.locator('#skip').click();expect(await page.locator('#notation').evaluate(node=>node.scrollLeft)).toBe(0);
 await page.evaluate(async()=>{
   const {setNotation,showSolution}=await import('/src/notation.mjs');
   const meter={top:2,bottom:4,beats:2,unit:2};
   setNotation({clef:'sol',meter,measures:[[...Array.from({length:16},()=>({pitch:6,length:.25}))],[]],edit:true,editNotes:true});
   showSolution({clef:'sol',meter,measures:[[{pitch:6,length:2},{pitch:6,length:2}],[]]},true);
 });
 const viewBoxes=await page.locator('#notation svg').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('viewBox')));
 expect(viewBoxes).toHaveLength(2);expect(viewBoxes[0]).toBe(viewBoxes[1]);
 const left=await page.locator('#notation svg').nth(0).locator('[data-voice="1"][data-bar="1"]').boundingBox();
 const right=await page.locator('#notation svg').nth(1).locator('[data-voice="1"][data-bar="1"]').boundingBox();
 expect(left.x).toBeCloseTo(right.x,1);
});
