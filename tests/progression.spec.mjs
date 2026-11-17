import { test, expect } from '@playwright/test';
import { chooseExercise, selectValue } from './navigation.mjs';

test('six chord answers persist, grade and show the solution on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('.tab').first().waitFor({state:'attached'});
  await chooseExercise(page,12);
  await expect(page.locator('#title')).toHaveText('Progresión de acordes');
  await expect(page.getByRole('checkbox',{name:'Incluir acordes con séptima'})).not.toBeChecked();
  await expect(page.getByRole('checkbox',{name:'En 1 octava',exact:true})).toBeChecked();
  await expect(page.locator('#editor [role=combobox]')).toHaveCount(6);
  await expect(page.locator('#playLabel')).toHaveText('Escuchar progresión');
  await expect(page.locator('#next')).toBeDisabled();
  const answer=await page.evaluate(async()=>{
    const {withSeed}=await import('/src/dom.mjs');
    const {progressionQuestion}=await import('/src/exercises/progression.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    return withSeed(saved.seed,progressionQuestion).steps[0].answer.split(' → ');
  });
  const field=index=>page.getByRole('combobox',{name:`Acorde ${index+1}`,exact:true});
  await expect(field(0)).toContainText('I');
  await expect(field(0)).toBeDisabled();
  await selectValue(page,field(1),answer[1]);
  await page.reload();await expect(field(0)).toContainText(answer[0]);
  await expect(field(0)).toBeDisabled();
  await expect(field(1)).toContainText(answer[1]);
  for(let index=2;index<6;index++)await selectValue(page,field(index),answer[index]);
  await page.locator('#next').click();await expect(page.locator('#feedback')).toContainText('¡Correcto!');
  await expect(field(0)).toBeDisabled();
  await page.reload();await expect(page.locator('#feedback')).toContainText('¡Correcto!');
  await page.locator('#next').click();await expect(page.locator('#next')).toBeDisabled();
  await expect(field(0)).toContainText('I');await expect(field(0)).toBeDisabled();
  for(let index=1;index<6;index++)await selectValue(page,field(index),'ii');
  await page.locator('#next').click();await expect(page.locator('#feedback')).toContainText('Respuesta: I →');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('one octave control defaults on, persists and regenerates answers',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();
  await chooseExercise(page,12);
  const toggle=page.getByRole('checkbox',{name:'En 1 octava',exact:true});
  await expect(toggle).toBeChecked();
  const field=page.getByRole('combobox',{name:'Acorde 2',exact:true});
  await selectValue(page,field,'ii');
  await toggle.uncheck();
  await expect(field).toContainText('Elegí…');
  await expect(page.locator('#next')).toBeDisabled();
  await page.reload();await expect(toggle).not.toBeChecked();
  await toggle.check();await page.reload();await expect(toggle).toBeChecked();
  await chooseExercise(page,0);await expect(toggle).toBeHidden();
});

test('chord count defaults to six, persists and grades the selected length',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();
  await chooseExercise(page,12);
  const count=page.getByRole('combobox',{name:'Cantidad de acordes en la progresión',exact:true});
  await expect(page.locator('#progression-count')).toHaveValue('6');
  for(const length of [8,4]) {
    await selectValue(page,count,String(length));
    await expect(page.locator('#editor [role=combobox]')).toHaveCount(length);
    await expect(page.locator('#context')).toContainText(`${length} acordes`);
    await expect(page.getByRole('combobox',{name:'Acorde 1',exact:true})).toBeDisabled();
    await expect(page.locator('#next')).toBeDisabled();
  }
  await page.reload();await expect(page.locator('#progression-count')).toHaveValue('4');
  await expect(page.locator('#editor [role=combobox]')).toHaveCount(4);
  const answer=await page.evaluate(async()=>{
    const {withSeed}=await import('/src/dom.mjs');
    const {modes}=await import('/src/registry.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    return withSeed(saved.seed,modes.progressions.create).steps[0].answer.split(' → ');
  });
  for(let index=1;index<answer.length;index++)await selectValue(page,page.getByRole('combobox',{name:`Acorde ${index+1}`,exact:true}),answer[index]);
  await page.locator('#next').click();await expect(page.locator('#feedback')).toContainText('¡Correcto!');
  await page.locator('#next').click();await expect(page.locator('#editor [role=combobox]')).toHaveCount(4);
  await expect(page.locator('#next')).toBeDisabled();
  await chooseExercise(page,0);await expect(count).toBeHidden();
});

test('sevenths switch regenerates the exercise, persists and excludes seventh answers when off',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();
  await chooseExercise(page,12);
  const toggle=page.getByRole('checkbox',{name:'Incluir acordes con séptima'});
  const options=()=>page.locator('#editor select').first().evaluate(node=>[...node.options].map(option=>option.value));
  await expect(toggle).not.toBeChecked();
  expect(await options()).toContain('V/ii');
  expect(await options()).not.toContain('V⁷/ii');
  await selectValue(page,page.getByRole('combobox',{name:'Acorde 2',exact:true}),'ii');
  await toggle.check();
  expect(await options()).toContain('V⁷/ii');
  await expect(page.getByRole('combobox',{name:'Acorde 1',exact:true})).toContainText('I');
  await expect(page.getByRole('combobox',{name:'Acorde 1',exact:true})).toBeDisabled();
  await expect(page.getByRole('combobox',{name:'Acorde 2',exact:true})).toContainText('Elegí…');
  await expect(page.locator('#next')).toBeDisabled();
  await page.reload();await expect(toggle).toBeChecked();
  expect(await options()).toContain('V⁷/ii');
  await toggle.uncheck();await page.reload();await expect(toggle).not.toBeChecked();
  expect(await options()).not.toContain('V⁷/ii');
  await chooseExercise(page,0);await expect(toggle).toBeHidden();
});
