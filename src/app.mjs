import { checkCookies } from './storage.mjs';
import { initDashboard } from './dashboard.mjs';
import { initSettings } from './settings.mjs';
import { initExerciseUI } from './exercise-ui.mjs';
import { initPractice } from './practice.mjs';
import { initMetronome } from './metronome.mjs';

export function initializeApp() {
checkCookies();
const exercises = initExerciseUI(()=>practice.advance(),()=>practice.active());
initSettings(exercises.refreshSound);
const practice = initPractice(exercises);
initMetronome();

initDashboard(exercises.stats);
window.addEventListener('practica:navigate',()=>exercises.stopAudio());
window.addEventListener('practica:select',event=>practice.open(event.detail));

}
