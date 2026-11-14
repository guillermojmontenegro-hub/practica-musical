import { test, expect } from '@playwright/test';
import { chooseExercise, selectValue, openSidebar, navigate } from './navigation.mjs';

test('interval answers use three custom selectors, persist and grade correctly',async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,11);
 await expect(page.locator('#editor [role=combobox]')).toHaveCount(3);
 await expect(page.locator('#next')).toBeDisabled();
 const answer=await page.evaluate(async()=>{
  const {withSeed}=await import('/src/dom.mjs'),{intervalQuestion}=await import('/src/exercises/ear.mjs');
  const seed=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('practica-ejercicio=')).split('=').slice(1).join('='))).seed;
  return withSeed(seed,intervalQuestion).steps[0].answer;
 });
 const match=/^(\d+)\.º (\S+) (ascendente|descendente)$/.exec(answer);
 await selectValue(page,page.getByRole('combobox',{name:'Intervalo',exact:true}),match[1]);
 await selectValue(page,page.getByRole('combobox',{name:'Calidad',exact:true}),match[2][0].toUpperCase()+match[2].slice(1));
 await expect(page.locator('#next')).toBeDisabled();
 await page.reload();await page.locator('#editor [role=combobox]').first().waitFor();
 await expect(page.getByRole('combobox',{name:'Intervalo',exact:true})).toContainText(`${match[1]}.º`);
 await selectValue(page,page.getByRole('combobox',{name:'Dirección',exact:true}),match[3]==='ascendente'?'1':'-1');
 await page.locator('#next').click();await expect(page.locator('#feedback')).toContainText('¡Correcto!');
 expect(errors).toEqual([]);
});

test('key reading offers major, minor or both and key writing has no meter',async ({page})=>{
 await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,3);
 await expect(page.locator('#editor [role=combobox]')).toHaveCount(4);
 await selectValue(page,'#key-practice','major');await expect(page.locator('#editor [role=combobox]')).toHaveCount(2);
 await expect(page.getByRole('combobox',{name:'Nota menor',exact:true})).toHaveCount(0);
 await selectValue(page,'#key-practice','minor');await expect(page.getByRole('combobox',{name:'Nota menor',exact:true})).toBeVisible();
 await selectValue(page,'#key-practice','both');
 const answer=await page.evaluate(async()=>{
  const {withSeed}=await import('/src/dom.mjs'),{keyQuestion}=await import('/src/exercises/keys.mjs');
  const seed=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('practica-ejercicio=')).split('=').slice(1).join('='))).seed;
  return withSeed(seed,()=>keyQuestion(false)).steps[0].answer;
 });
 for(const name of answer.split(' / ')){
  const [,note,alter,kind]=/^(Do|Re|Mi|Fa|Sol|La|Si)(♯|♭)? (mayor|menor)$/.exec(name);
  await selectValue(page,page.getByRole('combobox',{name:`Nota ${kind}`,exact:true}),note);
  await selectValue(page,page.getByRole('combobox',{name:`Alteración ${kind}`,exact:true}),alter||'natural');
 }
 await page.locator('#next').click();await expect(page.locator('#feedback')).toContainText('¡Correcto!');
 await chooseExercise(page,4);await expect(page.locator('#meter-filter')).toBeHidden();
 await expect(page.locator('#context')).not.toContainText('/');
});

test('the shared selector supports keyboard, sidebar settings and dashboard filters on mobile',async ({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('.tab').first().waitFor({state:'attached'});
 await openSidebar(page);await page.locator('.sound-settings > summary').click();
 await selectValue(page,'#instrument','flute');await expect(page.locator('#instrument')).toHaveValue('flute');
 const trigger=page.locator('[data-native-select=instrument]');await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('Enter');
 await expect(page.locator('#instrument')).toHaveValue('piano');
 await navigate(page,'Estadísticas');await selectValue(page,page.getByRole('combobox',{name:'Período',exact:true}),'7');
 await expect(page.getByRole('combobox',{name:'Período',exact:true})).toContainText('Últimos 7 días');
 expect(await page.locator('select').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).display==='none'))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/conservatorio-custom-selects.png',fullPage:true});
});
