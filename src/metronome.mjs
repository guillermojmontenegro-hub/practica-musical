import {claimAudio} from './audio-session.mjs';
import { $ } from './dom.mjs';
import { unlockAudio, newClickTrack } from './audio.mjs';
import { clamp, preferences, savePreferences } from './settings.mjs';

function initMetronome() {
  const tempo = $('metro-tempo'), meter = $('metro-meter'), subdivide = $('metro-subdivision');
  const button = $('metro-toggle'), display = $('metro-beat');
  tempo.value = clamp(preferences.metroTempo,30,240,80);
  if (Array.from(meter.options).some(option=>option.value===preferences.metroMeter)) meter.value = preferences.metroMeter;
  subdivide.checked = Boolean(preferences.metroSubdivision);
  let track, timer, step, nextTime, lease, generation = 0;
  const pending = new Set();
  function stop() {
    lease?.release();lease=undefined;
    generation++;
    clearInterval(timer);
    for (const task of pending) clearTimeout(task);
    pending.clear();
    track?.stop();
    track = undefined;
    display.textContent = '';
    button.textContent = 'Iniciar metrónomo';
    button.setAttribute('aria-pressed','false');
  }
  function schedule() {
    const [numerator,denominator] = meter.value.split('/').map(Number);
    const beats = denominator===8 ? numerator/3 : numerator;
    const ticks = subdivide.checked ? (denominator===8 ? 3 : 2) : 1;
    const interval = 60/Number(tempo.value)/ticks;
    if (nextTime < track.now()-.12) nextTime = track.now()+.025;
    while (nextTime < track.now()+.10) {
      const beat = Math.floor(step/ticks);
      const sub = step%ticks;
      track.click(nextTime,sub ? 73 : beat===0 ? 87 : 79,sub ? .07 : .14);
      if (!sub) {
        const task = setTimeout(()=>{
          pending.delete(task);
          display.textContent = `${beat+1} / ${beats}`;
        },Math.max(0,(nextTime-track.now())*1000));
        pending.add(task);
      }
      nextTime += interval;
      step = (step+1)%(beats*ticks);
    }
  }
  async function start() {
    lease=claimAudio(stop);
    const token = ++generation;
    const ready = await unlockAudio();
    if (token!==generation) return;
    if (!ready) {
      display.textContent = 'No se pudo iniciar el sonido.';
      return;
    }
    track = newClickTrack(lease);
    step = 0;
    nextTime = track.now()+.03;
    button.textContent = 'Detener metrónomo';
    button.setAttribute('aria-pressed','true');
    schedule();
    timer = setInterval(schedule,25);
  }
  button.addEventListener('click',()=>{if (track) stop(); else start();});
  for (const input of [tempo,meter,subdivide]) input.addEventListener('change',()=>{
    tempo.value = clamp(tempo.value,30,240,80);
    Object.assign(preferences,{metroTempo:tempo.value,metroMeter:meter.value,metroSubdivision:subdivide.checked});
    savePreferences();
    if (track) { stop(); start(); }
  });
}

export { initMetronome };
