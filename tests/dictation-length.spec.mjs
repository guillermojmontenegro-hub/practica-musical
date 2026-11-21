import {test,expect} from '@playwright/test';
import {chooseExercise,selectValue} from './navigation.mjs';

test('dictation difficulty starts a new melody, persists and is independent of sight reading',async({page})=>{
  await page.goto('/');await chooseExercise(page,7);
  const level=page.getByRole('combobox',{name:'Dificultad',exact:true});
  await expect(level).toHaveText(/Inicial/);
  await selectValue(page,'#dictation-bars','4');
  for(const [value,label] of [['intermediate','Intermedio'],['advanced','Avanzado']]) {
    await page.locator('#notation').focus();await page.keyboard.press('Enter');
    await expect(page.locator('[data-note-bar]')).toHaveCount(1);
    await selectValue(page,level,value);
    await expect(page.locator('#context')).toContainText(label);
    await expect(page.locator('[data-note-bar]')).toHaveCount(0);
    await expect(page.locator('[data-staff-bar]')).toHaveCount(4);
  }
  await page.locator('#notation').focus();await page.keyboard.press('Enter');
  await page.reload();
  await expect(level).toHaveText(/Avanzado/);
  await expect(page.locator('[data-note-bar]')).toHaveCount(1);
  await chooseExercise(page,5);
  await expect(level).toHaveText(/Inicial/);
});

test('dictation length defaults to two, persists, resets the draft and controls completion',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:1000});
  await page.goto('/');await page.locator('.tab').first().waitFor({state:'attached'});await chooseExercise(page,7);
  const length=page.getByRole('combobox',{name:'Compases',exact:true});
  await expect(page.locator('#dictation-bars')).toHaveValue('2');
  await expect(page.locator('.score-position')).toHaveText('Compás 1 de 2');
  await expect(page.locator('[data-staff-bar]')).toHaveCount(2);
  await page.getByRole('button',{name:'Negra',exact:true}).click();
  await page.locator('#notation').focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-note-bar]')).toHaveCount(1);
  await selectValue(page,length,'4');
  await expect(page.locator('[data-note-bar]')).toHaveCount(0);
  await expect(page.locator('[data-staff-bar]')).toHaveCount(4);
  await expect(page.locator('#next')).toBeDisabled();
  await page.reload();await expect(page.locator('#dictation-bars')).toHaveValue('4');
  await expect(page.locator('[data-staff-bar]')).toHaveCount(4);
  await selectValue(page,'#meter-choice','simple');
  for(const count of [4,2]) {
    if(count===2)await selectValue(page,length,'2');
    const capacity=Number((await page.locator('#editor > [role=status]').textContent()).match(/de (\d+)/)[1]);
    await page.getByRole('button',{name:'Negra',exact:true}).click();
    for(let bar=0;bar<count;bar++) {
      if(bar)await page.getByRole('button',{name:'Compás siguiente',exact:true}).click();
      await page.locator('#notation').focus();
      for(let i=0;i<capacity/2;i++)await page.keyboard.press('Enter');
      if(bar<count-1)await expect(page.locator('#next')).toBeDisabled();
    }
    await expect(page.locator('#next')).toBeEnabled();await page.locator('#next').click();
    await expect(page.locator('#notation svg')).toHaveCount(2);
    await expect(page.locator('#notation svg').first().locator('[data-voice="1"]')).toHaveCount(count);
    await expect(page.locator('#notation svg').last().locator('[data-voice="1"]')).toHaveCount(count);
    await page.locator('#next').click();await expect(page.locator('#next')).toBeDisabled();
  }
  await page.reload();await expect(page.locator('#dictation-bars')).toHaveValue('2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await chooseExercise(page,5);await expect(length).toBeHidden();
  await expect(page.locator('#notation [data-voice="1"]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('a draft from before difficulty levels resumes at advanced with its original seed and notes',async({page})=>{
  await page.goto('/');await chooseExercise(page,7);
  await selectValue(page,'#dictation-difficulty','advanced');
  await page.locator('#notation').focus();await page.keyboard.press('Enter');
  const originalSeed=await page.evaluate(async()=>{
    const {readStorage,writeCookie}=await import('/src/storage.mjs');
    const draft=readStorage('practica-ejercicio');
    const prefs=readStorage('practica-musical-preferencias');
    delete draft.difficulty;
    delete prefs.dictationDifficulty;
    writeCookie('practica-ejercicio',draft);
    writeCookie('practica-musical-preferencias',prefs);
    return draft.seed;
  });
  await page.reload();await expect(page.locator('#dictation-difficulty')).toHaveValue('advanced');
  await expect(page.locator('[data-note-bar]')).toHaveCount(1);
  expect(await page.evaluate(async()=>(await import('/src/storage.mjs')).readStorage('practica-ejercicio').seed)).toBe(originalSeed);
});

test('legacy four-bar drafts cannot restore an out-of-range bar into the new default',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,7);
  await page.evaluate(async()=>{
    const {writeCookie}=await import('/src/storage.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    writeCookie('practica-ejercicio',{...saved,barCount:undefined});
    localStorage.setItem('practica-edicion-v2',JSON.stringify({mode:'dictation',seed:saved.seed,actions:[[3,4,'2',null,0]]}));
  });
  await page.reload();await expect(page.locator('.score-position')).toHaveText('Compás 1 de 2');
  await expect(page.locator('[data-note-bar]')).toHaveCount(0);await expect(page.locator('#next')).toBeDisabled();
  expect(errors).toEqual([]);
});
