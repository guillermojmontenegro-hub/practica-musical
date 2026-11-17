import {test,expect} from '@playwright/test';
import {chooseExercise,selectValue,navigate} from './navigation.mjs';

async function answer(page) {
  return page.evaluate(async()=>{
    const {withSeed}=await import('/src/dom.mjs'),{modes}=await import('/src/registry.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    return withSeed(saved.seed,modes[saved.mode].create).steps[saved.step].answer;
  });
}
const lastAttempt=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('practica-intentos-v2')).at(-1));

test('progression partial credit excludes the given I and highlights each answer after reload',async({page})=>{
  await page.setViewportSize({width:390,height:1000});
  await page.goto('/');await page.locator('.tab').first().waitFor({state:'attached'});await chooseExercise(page,12);
  await selectValue(page,'#progression-count','4');
  const symbols=(await answer(page)).split(' → ');
  for(let index=1;index<4;index++)await selectValue(page,page.getByRole('combobox',{name:`Acorde ${index+1}`,exact:true}),index===3?'ii':symbols[index]);
  await page.locator('#next').click();
  expect((await lastAttempt(page)).credit).toBeCloseTo(2/3);
  expect((await lastAttempt(page)).correct).toBe(false);
  await expect(page.locator('#editor label[data-result=correct]')).toHaveCount(2);
  await expect(page.locator('#editor label[data-result=incorrect]')).toHaveCount(1);
  await expect(page.locator('#answer-review li')).toHaveCount(3);
  await expect(page.locator('#answer-review')).not.toContainText('%');
  await page.reload();await expect(page.locator('#answer-review li')).toHaveCount(3);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('practica-intentos-v2')).length)).toBe(1);
  await page.screenshot({path:'/tmp/partial-progression.png',fullPage:true,animations:'disabled'});
  await navigate(page,'Estadísticas');
  await expect(page.locator('.stats-grid .stat-card')).toHaveCount(3);
  await expect(page.getByText('Puntaje obtenido',{exact:true})).toHaveCount(0);
});

test('interval components receive partial credit',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,11);
  const [,number,quality,direction]=/^(\d+)\.º (\S+) (ascendente|descendente)$/.exec(await answer(page));
  await selectValue(page,page.getByRole('combobox',{name:'Intervalo',exact:true}),number);
  await selectValue(page,page.getByRole('combobox',{name:'Calidad',exact:true}),quality[0].toUpperCase()+quality.slice(1));
  await selectValue(page,page.getByRole('combobox',{name:'Dirección',exact:true}),direction==='ascendente'?'-1':'1');
  await page.locator('#next').click();
  expect((await lastAttempt(page)).credit).toBeCloseTo(2/3);
  await expect(page.locator('#editor label[data-result=correct]')).toHaveCount(2);
  await expect(page.locator('#editor label[data-result=incorrect]')).toHaveCount(1);
});

test('key reading grades every note and accidental',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,3);
  const names=(await answer(page)).split(' / ');
  for(const name of names) {
    const [,note,alter,kind]=/^(Do|Re|Mi|Fa|Sol|La|Si)(♯|♭)? (mayor|menor)$/.exec(name);
    await selectValue(page,page.getByRole('combobox',{name:`Nota ${kind}`,exact:true}),note);
    await selectValue(page,page.getByRole('combobox',{name:`Alteración ${kind}`,exact:true}),alter==='♯'?'♭':'♯');
  }
  await page.locator('#next').click();expect((await lastAttempt(page)).credit).toBe(.5);
  await expect(page.locator('#editor label[data-result=correct]')).toHaveCount(2);
  await expect(page.locator('#editor label[data-result=incorrect]')).toHaveCount(2);
});

test('secondary dominant exercise combines both steps and retains both corrections',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,2);
  await page.locator('#answers').getByRole('button',{name:await answer(page),exact:true}).click();await page.locator('#next').click();
  await page.locator('#next').click();
  const correct=await answer(page);
  for(const button of await page.locator('#answers button').all())if(!(await button.textContent()).includes(correct)){await button.click();break;}
  await page.locator('#next').click();expect((await lastAttempt(page)).credit).toBe(.5);
  await expect(page.locator('#answer-review li[data-result=correct]')).toHaveCount(1);
  await expect(page.locator('#answer-review li[data-result=incorrect]')).toHaveCount(1);
  await page.reload();await expect(page.locator('#answer-review li')).toHaveCount(2);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('practica-intentos-v2')).length)).toBe(1);
});

test('singing retains its listening adjustment internally without displaying points',async({page})=>{
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,6);
  await page.evaluate(async()=>{
    const {writeCookie}=await import('/src/storage.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    writeCookie('practica-ejercicio',{...saved,listens:2});
  });
  await page.reload();await page.locator('#next').click();
  await page.getByRole('button',{name:'Me salió bien',exact:true}).click();
  expect((await lastAttempt(page)).credit).toBeCloseTo(1/3);
  await expect(page.locator('#scoreLabel')).toHaveText('Aciertos');
  await expect(page.locator('#score')).toHaveText('1 / 1');
  await expect(page.getByText('Puntaje ajustado por escuchas',{exact:true})).toHaveCount(0);
});

// Restore a real notation draft through the editor action log, then grade it through the UI.
async function writePartialScore(page) {
  return page.evaluate(async()=>{
    const {withSeed}=await import('/src/dom.mjs'),{modes}=await import('/src/registry.mjs');
    const {clefs}=await import('/src/music.mjs'),{writeCookie}=await import('/src/storage.mjs');
    const saved=JSON.parse(decodeURIComponent(document.cookie.split('; ').find(cookie=>cookie.startsWith('practica-ejercicio=')).split('=').slice(1).join('=')));
    let score=withSeed(saved.seed,modes[saved.mode].create).steps[0].solution;
    while(saved.mode==='keyWrite'&&!score.signs.length) {
      saved.seed++;score=withSeed(saved.seed,modes[saved.mode].create).steps[0].solution;
    }
    const actions=[],bottom=clefs[score.clef].bottom;
    if(saved.mode==='keyWrite') {
      score.signs.forEach((pitch,index)=>actions.push([0,pitch-bottom-(index===0?1:0),score.symbol,null,0]));
    } else {
      const voices=[score.measures,...(score.secondaryMeasures?[score.secondaryMeasures]:[])];
      voices.forEach((bars,voice)=>bars.forEach((bar,b)=>{
        for(let index=0;index<bar.length;index++) {
          const note=bar[index],position=note.pitch-bottom;
          if(note.tuplet) {
            const group=bar.slice(index,index+note.tuplet.size),span=group.reduce((sum,note)=>sum+note.length,0);
            const tool=`n${group.length}@${span}@0`;
            actions.push([b,position,tool,null,voice]);
            group.forEach((member,n)=>actions.push([b,member.pitch-bottom,(member.rest?'r@':'')+tool,index+n,voice]));
            index+=group.length-1;
          } else actions.push([b,position,(note.rest?'r@':'')+String(note.length),null,voice]);
        }
      }));
      voices.forEach((bars,voice)=>bars.forEach((bar,b)=>bar.forEach((note,index)=>{if(note.tie)actions.push([b,note.pitch-bottom,'tie',index,voice]);})));
      const first=score.measures[0][0];
      if(score.rhythm)actions.push([0,first.pitch-bottom,'rest',0,0]);
      else {
        const group=first.tuplet,tool=group?`n${group.size}@${score.measures[0].slice(0,group.size).reduce((sum,note)=>sum+note.length,0)}@0`:String(first.length);
        actions.push([0,first.pitch-bottom+(first.pitch-bottom<7?1:-1),tool,0,0]);
      }
    }
    localStorage.setItem('practica-edicion-v2',JSON.stringify({mode:saved.mode,seed:saved.seed,actions}));
    writeCookie('practica-ejercicio',{...saved,grade:undefined,outcomes:[],firstCorrect:true,fields:{}});
    return saved.mode==='keyWrite'?(score.signs.length+1)/(score.signs.length+2):null;
  });
}

for(const [mode,index] of [['keyWrite',4],['dictation',7],['rhythm',8],['polyrhythm',9],['tuplets',10]])test(`${mode} stores partial credit and marks notation after reload`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('.tab').first().waitFor();await chooseExercise(page,index);
  const expected=await writePartialScore(page);
  await page.reload();await expect(page.locator('#next')).toBeEnabled();
  await page.locator('#next').click();
  const attempt=await lastAttempt(page);
  expect(attempt.correct).toBe(false);expect(attempt.credit).toBeGreaterThan(0);expect(attempt.credit).toBeLessThan(1);
  if(expected!==null)expect(attempt.credit).toBeCloseTo(expected);
  await expect(page.locator('.notation-result[data-result=incorrect]').first()).toBeVisible();
  if(mode!=='keyWrite')expect(await page.locator('.notation-result[data-result=correct]').count()).toBeGreaterThan(0);
  await expect(page.locator('#answer-review li[data-result=incorrect]').first()).toBeVisible();
  await expect(page.locator('#answer-review')).not.toContainText('%');
  await page.reload();await expect(page.locator('.notation-result[data-result=incorrect]').first()).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('practica-intentos-v2')).length)).toBe(1);
  if(mode==='polyrhythm') {
    await page.getByRole('button',{name:'Activar modo oscuro',exact:true}).click();
    await page.screenshot({path:'/tmp/partial-two-voices.png',fullPage:true,animations:'disabled'});
  }
  expect(errors).toEqual([]);
});
