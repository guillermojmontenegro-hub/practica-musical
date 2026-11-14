import { readStorage, writeCookie } from './storage.mjs';
import { saveSessionResult } from './dashboard.mjs';
import { $ } from './dom.mjs';
import { modes } from './registry.mjs';
import { preferences, savePreferences } from './settings.mjs';
import { ring, unlockAudio } from './audio.mjs';

export function initPractice(controller) {
  const tabs = new Map();
  const pool = new Map();
  let session = null;
  const durationFields = ['minutes','chair-minutes','rest-minutes','rounds'];
  const phases = [
    {id:'app',title:'Ejercicios de la app',description:'Resolvé los ejercicios que seleccionaste para esta ronda.'},
    {id:'chair',title:'Ejercicios de la cátedra',description:'Abrí tus partituras y practicalas por tu cuenta hasta que suene la alarma.'},
    {id:'rest',title:'Descanso',description:'Tomate una pausa antes del próximo bloque.'}
  ];
  const sessionKey = 'practica-pomodoro';
  const makeBlocks = ([app,chair,rest,rounds]) => Array.from({length:rounds},(_,index)=>phases.map((phase,i)=>({
    ...phase,minutes:[app,chair,rest][i],round:index+1
  })).filter(phase=>phase.minutes>0)).flat();
  function storeSession() {
    if (!session) { writeCookie(sessionKey,null); return; }
    const {blocks,lastSeen,...saved} = session;
    writeCookie(sessionKey,{...saved,lastSeen:[...lastSeen]});
  }
  function captureTime() {
    const phase = currentPhase();
    const index = phases.findIndex(item=>item.id===phase.id);
    const elapsed = phase.minutes*60000-Math.max(0,session.end-(session.pausedAt ?? Date.now()));
    session.times[index] += Math.max(0,elapsed);
  }
  const currentPhase = () => session?.blocks[session.index];
  function saveSessionPreferences() {
    for (const id of durationFields) preferences[id] = $(id).value;
    preferences.reminder = $('reminder').value;
    preferences.modes = [...pool].filter(([,input])=>input.checked).map(([id])=>id);
    preferences.knownModes = [...pool.keys()];
    savePreferences();
  }
  function openMode(id) {
    for (const [key,tab] of tabs) tab.setAttribute('aria-pressed',String(key === id));
    controller.open(id);
    $('current-exercise').textContent = modes[id].title;
    if (!session && preferences.exercise!==id) {
      preferences.exercise = id;
      savePreferences();
    }
  }
  function practiceWeight(id, age) {
    const {right=0,total=0,credit=right} = controller.stats[id] || {};
    return (1 + 5*(total-credit+1)/(total+2)) * (1 + Math.min(age,10)*.14);
  }
  function guidedMode() {
    const age = id => session.turn - (session.lastSeen.get(id) ?? 0);
    const overdue = session.ids.filter(id=>age(id)>=2*session.ids.length);
    const candidates = overdue.length ? overdue : session.ids.filter(id=>
      session.ids.length === 1 || id !== session.last || session.streak < 2);
    const weighted = candidates.map(id=>[id,practiceWeight(id,age(id)) * (id === session.last ? .7 : 1)]);
    let draw = Math.random()*weighted.reduce((sum,[,weight])=>sum+weight,0);
    const [id] = weighted.find(([,weight])=>(draw-=weight)<0) || weighted.at(-1);
    session.streak = id === session.last ? session.streak+1 : 1;
    session.last = id;
    session.lastSeen.set(id,++session.turn);
    storeSession();
    openMode(id);
  }
  function advance() {
    if (!session) controller.open(controller.mode);
    else if (session.pausedAt === null && Date.now() >= session.end) nextPhase();
    else if (appActive()) guidedMode();
  }
  function appActive() {
    return currentPhase()?.id==='app' && session.pausedAt === null;
  }
  function sessionControls(active) {
    $('clock').hidden = !active;
    $('start').hidden = active;
    for (const id of ['finish','pause-session','next-block','session-phase']) $(id).hidden = !active;
    for (const id of durationFields) $(id).disabled = active;
    for (const control of [...tabs.values(),...pool.values()]) control.disabled = active;
  }
  function showPhase() {
    const phase = currentPhase();
    const paused = session.pausedAt !== null;
    const visible = appActive();
    $('exercise-layout').hidden = !visible;
    $('workspace-session-status').hidden=visible;
    $('workspace-session-status').textContent=paused ? 'Práctica en pausa. Reanudá desde el menú lateral.' : `${phase.title}. ${phase.description} Los controles están en el menú lateral.`;
    controller.suspend(!visible);
    $('phase-title').textContent = phase.title + (paused ? ' · En pausa' : '');
    $('phase-round').textContent = `Ronda ${phase.round} de ${session.rounds}`;
    $('phase-description').textContent = phase.description;
    $('pause-session').textContent = paused ? 'Reanudar' : 'Pausar';
    showPhaseClock(session.pausedAt ?? Date.now());
  }
  function startPhase() {
    const phase = currentPhase();
    session.end = Date.now()+phase.minutes*60000;
    session.pausedAt = null;
    showPhase();
    if (appActive()) guidedMode();
    else storeSession();
    $('practice-status').textContent = `${phase.title} · ${phase.minutes} min.`;
  }
  function nextPhase(skipped=false) {
    if (!session) return;
    session.skipped ||= skipped;
    if (session.index+1===session.blocks.length) endSession(!session.skipped,true);
    else {
      captureTime();
      session.index++;
      startPhase();
      ring();
    }
  }
  function endSession(completed,reachedEnd=completed) {
    if (!session) return;
    const {original,rounds} = session;
    captureTime();
    saveSessionResult(session,completed);
    session = null;
    storeSession();
    sessionControls(false);
    $('exercise-layout').hidden = false;
    $('workspace-session-status').hidden=true;
    controller.suspend(false);
    openMode(original);
    $('practice-status').textContent = completed ? `Completaste ${rounds} ${rounds===1?'ronda':'rondas'} de práctica.` : reachedEnd ? 'Terminaste la sesión con bloques omitidos.' : 'Terminaste la sesión.';
    if (reachedEnd) ring();
  }
  function showPhaseClock(now) {
    const seconds = Math.max(0,Math.ceil((session.end-now)/1000));
    $('clock').textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  function tick() {
    const now = new Date();
    if (session && session.pausedAt === null) {
      if (now.getTime() >= session.end) nextPhase();
      else showPhaseClock(now.getTime());
    }
    const [hours,minutes] = $('reminder').value.split(':').map(Number);
    const day = now.toDateString();
    if (now.getHours() === hours && now.getMinutes() === minutes && preferences.reminded !== day) {
      preferences.reminded = day;
      saveSessionPreferences();
      if (!session) {
        $('practice-status').textContent = `Es hora de practicar. Tenés programados ${plannedMinutes()} min.`;
        ring();
      }
    }
  }
  for (const [id,exercise] of Object.entries(modes)) {
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.innerHTML = `<span class="ico" aria-hidden="true">${exercise.icon}</span><span><strong>${exercise.label || exercise.title}</strong><small>${exercise.short}</small></span>`;
    tab.addEventListener('click',()=>{
      if (!session) {
        if(controller.mode!==id) openMode(id);
        window.dispatchEvent(new CustomEvent('practica:exercise-picked'));
      }
    });
    document.querySelector('.nav').append(tab);
    tabs.set(id,tab);
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Array.isArray(preferences.modes) ? preferences.modes.includes(id) || !(preferences.knownModes || Object.keys(modes).filter(key=>!['rhythm','polyrhythm','tuplets'].includes(key))).includes(id) : true;
    input.addEventListener('change',saveSessionPreferences);
    label.append(input,' '+(exercise.label || exercise.title));
    $('practice-types').append(label);
    pool.set(id,input);
  }
  for (const [id,fallback] of durationFields.map((id,index)=>[id,[15,10,5,1][index]])) {
    $(id).value = preferences[id] ?? fallback;
    $(id).addEventListener('change',saveSessionPreferences);
  }
  const plannedMinutes = () => durationFields.slice(0,3).reduce((sum,id)=>sum+Number($(id).value),0)*Number($('rounds').value);
  $('reminder').value = preferences.reminder || '';
  $('reminder').addEventListener('change',async ()=>{
    delete preferences.reminded;
    saveSessionPreferences();
    if (!$('reminder').value) {
      $('practice-status').textContent = 'Recordatorio desactivado.';
      return;
    }
    const sound = await unlockAudio();
    $('practice-status').textContent = `Recordatorio diario a las ${$('reminder').value}. Dejá esta pestaña abierta.` +
      (sound ? '' : ' Usá «Probar alarma» para activar el sonido.');
    tick();
  });
  const enableSound = document.createElement('button');
  enableSound.className = 'skip';
  enableSound.type = 'button';
  enableSound.textContent = 'Probar alarma';
  enableSound.addEventListener('click',async ()=>{
    if (await unlockAudio()) ring();
    else $('practice-status').textContent = 'El navegador no pudo habilitar el sonido.';
  });
  $('practice-form').append(enableSound);
  $('practice-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (session) return;
    const ids = [...pool].filter(([,input])=>input.checked).map(([id])=>id);
    const [app,chair,rest,rounds] = durationFields.map(id=>Number($(id).value));
    if (!app && !chair) {
      $('practice-status').textContent = 'Asigná tiempo a los ejercicios de la app o de la cátedra.';
      return;
    }
    if (app && !ids.length) {
      $('pool').open = true;
      $('practice-status').textContent = 'Elegí al menos un tipo de ejercicio.';
      return;
    }
    saveSessionPreferences();
    const durations = [app,chair,rest,rounds];
    const blocks = makeBlocks(durations);
    const started = {ids,blocks,durations,rounds,index:0,original:controller.mode,turn:0,lastSeen:new Map(),
      started:Date.now(),times:[0,0,0]};
    session = started;
    sessionControls(true);
    startPhase();
    if (appActive()) controller.focus();
    else $('pause-session').focus();
    unlockAudio().then(sound=>{if (sound && session===started) ring();});
  });
  $('pause-session').addEventListener('click',()=>{
    if (!session) return;
    const now = Date.now();
    if (session.pausedAt === null) {
      if (now >= session.end) { nextPhase(); return; }
      session.pausedAt = now;
    } else {
      session.end += now-session.pausedAt;
      session.pausedAt = null;
    }
    showPhase();
    storeSession();
  });
  $('next-block').addEventListener('click',()=>nextPhase(true));
  $('finish').addEventListener('click',()=>{endSession(false); $('start').focus();});
  document.addEventListener('visibilitychange',tick);
  setInterval(tick,250);
  const saved = readStorage(sessionKey);
  if (saved?.durations && saved.times && Number.isFinite(saved.end)) {
    session = {...saved,blocks:makeBlocks(saved.durations),lastSeen:new Map(saved.lastSeen)};
    if (currentPhase()) {
      sessionControls(true);
      openMode(Object.hasOwn(modes,saved.last) ? saved.last : controller.mode);
      showPhase();
    } else session = null;
  }
  if (!session) openMode(controller.mode);
  if (!session && $('reminder').value) $('practice-status').textContent = `Recordatorio diario a las ${$('reminder').value}. Dejá esta pestaña abierta y probá la alarma al volver a abrirla.`;
  tick();
  return {advance, active:appActive, open(id) { if (!session && Object.hasOwn(modes,id)) openMode(id); else if(session) $('practice-status').textContent = 'Terminá la práctica guiada para elegir otro ejercicio.'; }};
}
