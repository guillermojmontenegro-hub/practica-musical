import { $, pick } from './dom.mjs';
import { instruments } from './audio.mjs';

import { readStorage, writeCookie } from './storage.mjs';

const preferencesKey = 'practica-musical-preferencias';
const preferences = readStorage(preferencesKey);
const savePreferences = () => writeCookie(preferencesKey,preferences);
const instrumentIds = Object.keys(instruments).filter(id=>id!=='click'&&!instruments[id].percussion);
const randomTempos = [56,64,72,80,88,96,104,112,120,132];
const clamp = (value,min,max,fallback) => Math.min(max,Math.max(min,Number(value) || fallback));
let lastInstrument;
let lastTempo;
function nextSound() {
  if (!$('random-instrument').checked) lastInstrument = $('instrument').value;
  lastTempo = $('random-tempo').checked ? pick(randomTempos.filter(bpm=>bpm!==lastTempo)) : clamp($('tempo').value,40,220,90);
  return {instrument:$('instrument').value,bpm:lastTempo};
}

function playbackSound(sound) {
  if (!$('random-instrument').checked) return sound;
  lastInstrument = pick(instrumentIds.filter(id=>id!==lastInstrument));
  return {...sound,instrument:lastInstrument};
}

function initSettings(onChange) {
  for (const id of instrumentIds) $('instrument').add(new Option(instruments[id].name,id));
  $('instrument').value = instrumentIds.includes(preferences.instrument) ? preferences.instrument : 'piano';
  $('random-instrument').checked = preferences.randomInstrument ?? preferences.instrument === 'random';
  $('instrument').disabled = $('random-instrument').checked;
  $('tempo').value = clamp(preferences.tempo,40,220,90);
  $('random-tempo').checked = Boolean(preferences.randomTempo);
  $('tempo').disabled = $('random-tempo').checked;
  for (const id of ['instrument','random-instrument','tempo','random-tempo']) $(id).addEventListener('change',()=>{
    $('tempo').value = clamp($('tempo').value,40,220,90);
    $('tempo').disabled = $('random-tempo').checked;
    $('instrument').disabled = $('random-instrument').checked;
    Object.assign(preferences,{
      instrument:$('instrument').value,randomInstrument:$('random-instrument').checked,
      tempo:$('tempo').value,randomTempo:$('random-tempo').checked
    });
    savePreferences();
    onChange();
  });
  $('progression-sevenths').checked = preferences.progressionSevenths === true;
  for (const [id,key,values,fallback] of [
    ['sight-clef','sightClef',['sol','fa','both'],'sol'],
    ['sight-difficulty','sightDifficulty',['beginner','intermediate','advanced'],'beginner']
  ]) {
    $(id).value=values.includes(preferences[key])?preferences[key]:fallback;
    $(id).addEventListener('change',()=>{preferences[key]=$(id).value;savePreferences();});
  }
  $('dictation-bars').value = Number(preferences.dictationBars)===4?'4':'2';
  $('dictation-bars').addEventListener('change',()=>{
    preferences.dictationBars = Number($('dictation-bars').value);
    savePreferences();
  });
  $('progression-count').value = [4,5,6,7,8].includes(Number(preferences.progressionCount)) ? String(preferences.progressionCount) : '6';
  $('progression-count').addEventListener('change',()=>{
    preferences.progressionCount = Number($('progression-count').value);
    savePreferences();
  });
  $('progression-dominants').value = ['none','always'].includes(preferences.progressionDominants) ? preferences.progressionDominants : 'mixed';
  $('progression-dominants').addEventListener('change',()=>{
    preferences.progressionDominants = $('progression-dominants').value;
    savePreferences();
  });
  $('progression-octave').checked = (preferences.progressionOneOctave ?? preferences.progressionAscending) !== false;
  $('progression-octave').addEventListener('change',()=>{
    preferences.progressionOneOctave = $('progression-octave').checked;
    savePreferences();
  });
  $('progression-sevenths').addEventListener('change',()=>{
    preferences.progressionSevenths = $('progression-sevenths').checked;
    savePreferences();
  });
  $('rhythm-pitches').value = preferences.rhythmPitches === '2' ? '2' : '1';
  $('rhythm-pitches').addEventListener('change',()=>{
    preferences.rhythmPitches = $('rhythm-pitches').value;
    savePreferences();
  });
  $('key-practice').value=['major','minor'].includes(preferences.keyPractice)?preferences.keyPractice:'both';
  $('key-practice').addEventListener('change',()=>{preferences.keyPractice=$('key-practice').value;savePreferences();});
  $('meter-choice').value = ['simple','compound'].includes(preferences.meter) ? preferences.meter : 'mixed';
  $('meter-choice').addEventListener('change',()=>{
    preferences.meter = $('meter-choice').value;
    savePreferences();
  });
}
export { preferences, savePreferences, clamp, nextSound, playbackSound, initSettings };
