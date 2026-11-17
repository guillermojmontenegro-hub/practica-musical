import {tempoUnitLabel} from './music.mjs';
import {claimAudio} from './audio-session.mjs';
import { setNotation, showSolution } from './notation.mjs';
import { readStorage, writeCookie } from './storage.mjs';
import { recordAttempt } from './dashboard.mjs';
import { lockStaff } from './staff-editor.mjs';
import { $, shuffle, withSeed } from './dom.mjs';
import { modes } from './registry.mjs';
import { instruments, unlockAudio, prepareExerciseAudio, playExercise, stopExerciseAudio } from './audio.mjs';
import { nextSound, playbackSound, preferences, savePreferences } from './settings.mjs';
import { assess, combinedCredit, showAnswerReview } from './grading.mjs';

export function initExerciseUI(advance,practiceActive) {
  const draftKey = 'practica-ejercicio';
  const statsKey = 'practica-musical-v1';
  let pending = readStorage(draftKey);
  const attempts = Object.fromEntries(Object.keys(modes).map(id=>[id,0]));
  let seed, staffDraft, savedDraftLength, outcomes=[], fieldDraft={};
  const staffKey = 'practica-edicion';
  function saveStaffDraft() {
    if (savedDraftLength===staffDraft.length) return;
    savedDraftLength = staffDraft.length;
    try {
      localStorage.setItem('practica-edicion-v2',JSON.stringify({mode,seed,actions:staffDraft}));
    } catch {
      const notice=$('cookie-status');
      notice.textContent='No se pudo guardar la edición. Mantené esta pestaña abierta para conservar el borrador actual.';
      notice.hidden=false;
    }
  }

  function restoreStaffDraft() {
    try {
      const saved=JSON.parse(localStorage.getItem('practica-edicion-v2')||'null');
      if(saved) return saved.mode===mode&&saved.seed===seed&&Array.isArray(saved.actions) ? saved.actions : [];
    } catch {}
    // Restore older drafts once; subsequent saves use the versioned action log.
    let packed = '';
    for (let index=0;index<4;index++) {
      const chunk = readStorage(staffKey+index);
      if (typeof chunk!=='string' || !chunk) break;
      packed += chunk;
    }
    const tools = [null,'1','2','3','♯','♭','none','tie','group2','group3','group4','group5'];
    return (packed.match(/.{3}/g) || []).map(item=>{
      const [bar,pitch,tool] = [...item].map(value=>parseInt(value,16));
      return [bar,pitch-2,tools[tool]];
    });
  }
  let restoredGrade = pending.grade;
  const stats = readStorage(statsKey);
  let mode = Object.hasOwn(modes,preferences.exercise) ? preferences.exercise : 'scales', question, step, selected, graded, firstCorrect;
  let suspended = false;
  let generation = 0, playing = false, sound, listens = 0, audioLease;

  function displaySound(current) {
    const name = current ? instruments[current.instrument].name :
      $('random-instrument').checked ? 'Instrumento aleatorio' : instruments[sound.instrument].name;
    const meter=question?.notation?.meter;
    const unit=meter?tempoUnitLabel(meter):'';
    $('tempo-unit').textContent=unit;$('tempo-unit').hidden=!unit;
    $('sound-playing').textContent = modes[mode].play ? `${question?.events?.some(event=>event[4]==='cymbal')?'Redoblante · Platillo':name} · ${sound.bpm} BPM${unit?' · '+unit:''}` : '';
  }

  function stopAudio() {
    audioLease?.release();audioLease=undefined;
    generation++;
    playing = false;
    stopExerciseAudio();
    $('listen').classList.remove('playing');
    $('play').setAttribute('aria-label','Reproducir audio');
    $('playStatus').textContent = '';
  }

  function exerciseEvents() {
    if (question.events) return question.events;
    if (question.dominant) return [
      ...question.dominant.map(note=>[note,0,1.10,.077]),
      ...question.resolution.map(note=>[note,1.25,1.25,.08])
    ];
    const scale = mode === 'scales';
    const spacing = scale ? .5 : $('arpeggio').checked ? .5 : 0;
    return question.notes.map((note,index)=>[note,index*spacing,scale ? .46 : spacing ? .72 : 1.45,spacing ? .15 : .095]);
  }

  async function play(events, onStarted) {
    if (playing && !events) { stopAudio(); return; }
    if (events) stopAudio();
    audioLease=claimAudio(stopAudio);
    const lease=audioLease;
    const token = ++generation;
    const ready = await unlockAudio();
    if (token !== generation) return;
    if (!ready) {
      $('playStatus').textContent = 'No se pudo reproducir. Probá de nuevo.';
      return;
    }
    const current = playbackSound(sound);
    const sequence=events||exerciseEvents();
    playing=true;
    $('play').setAttribute('aria-label','Detener audio');
    $('playStatus').textContent='Cargando instrumento…';
    const sampled=await prepareExerciseAudio(sequence,current);
    if(token!==generation)return;
    playExercise(sequence,current,stopAudio,lease);
    onStarted?.();
    displaySound(current);
    playing = true;
    $('listen').classList.add('playing');
    $('play').setAttribute('aria-label','Detener audio');
    $('playStatus').textContent = sampled?'Reproduciendo…':'Reproduciendo · sonido básico';
  }
  function saveDraft() {
    if (!question) return;
    const savedOutcomes=outcomes.map(({items,...result})=>question.steps.length>1?{...result,items}:result);
    writeCookie(draftKey,{mode,seed,step,selected,firstCorrect,listens,sound,grade:restoredGrade,outcomes:savedOutcomes,fields:fieldDraft});
  }
  function newQuestion(restore) {
    stopAudio();
    seed = restore?.seed ?? Math.floor(Math.random()*4294967296);
    question = withSeed(seed,()=>{
      const item = modes[mode].create();
      item.steps.forEach(part=>{if (part.options) part.options = shuffle(part.options);});
      return item;
    });
    sound = restore?.sound ?? nextSound();
    listens = restore?.listens ?? 0;
    staffDraft = restore ? restoreStaffDraft() : [];
    savedDraftLength = undefined;
    saveStaffDraft();
    step = restore?.step ?? 0;
    firstCorrect = restore?.firstCorrect ?? true;
    outcomes = restore?.outcomes ?? [];
    fieldDraft = restore?.fields ?? {};
    restoredGrade = restore?.grade;
    displaySound();
    attempts[mode]++;
    render();
    if (restore?.selected != null) choose(restore.selected);
    if (restoredGrade) submit(true);
    saveDraft();
  }
  function progress() {
    const {right=0,total=0} = stats[mode] || {};
    $('scoreLabel').textContent = 'Aciertos';
    $('score').textContent = right + ' / ' + total;
  }
  function render() {
    lockStaff();
    selected = null;
    graded = false;
    const {title,play:playLabel,meter} = modes[mode];
    const part = question.steps[step];
    $('title').textContent = title;
    $('playLabel').textContent = playLabel || '';
    $('listen').hidden = !playLabel;
    $('meter-filter').hidden = !meter;
    $('key-practice-filter').hidden=mode!=='keyRead';
    $('rhythm-pitches-label').hidden = !question.rhythmPitches;
    $('count').textContent = 'Ejercicio ' + attempts[mode] + (mode === 'harmony' ? ' · ' + (step+1) + '/2' : '');
    $('arpeggioLabel').hidden = mode !== 'chords';
    $('progression-sevenths-label').hidden = mode !== 'progressions';
    $('progression-octave-label').hidden = mode !== 'progressions';
    $('progression-count-label').hidden = mode !== 'progressions';
    $('harmony-context').hidden = !question.harmony;
    if (question.harmony) {
      const {homeKey,scale,chord} = question.harmony;
      $('harmony-key').textContent = homeKey;
      $('harmony-scale').textContent = scale;
      $('harmony-chord').textContent = chord;
    }
    $('context').hidden = !question.context;
    $('context').textContent = question.context || '';
    $('prompt').textContent = part.prompt;
    $('feedback').textContent = '';
    $('answer-review').replaceChildren();
    $('next').hidden = false;
    $('next').disabled = !part.reveal;
    $('next').textContent = part.reveal ? 'Ver referencia →' : 'Comprobar →';
    $('notation').hidden = !question.notation;
    setNotation(question.notation);
    $('editor').hidden = !part.editor;
    $('editor').replaceChildren();
    $('listen-melody').hidden = !question.fullMelody;
    $('listen-count').textContent = question.fullMelody ? 'Escuchas de la melodía: '+listens : '';
    $('editor').answerDraft=fieldDraft;
    $('editor').saveAnswerDraft=saveDraft;
    $('editor').staffDraft = staffDraft;
    $('editor').saveStaffDraft = saveStaffDraft;
    if (part.editor) part.editor($('editor'));
    $('notation').scrollLeft=0;
    $('answers').replaceChildren(...(part.options || []).map((option,index) => {
      const button = document.createElement('button');
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.setAttribute('aria-hidden','true');
      letter.textContent = 'ABCD'[index];
      button.className = 'answer';
      button.setAttribute('aria-pressed','false');
      button.append(letter,option);
      button.addEventListener('click',()=>choose(index));
      return button;
    }));
    progress();
  }
  function choose(index) {
    if (graded || index >= $('answers').children.length) return;
    selected = index;
    [...$('answers').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    $('next').disabled = false;
    saveDraft();
  }
  function submit(replaying=false) {
    const part = question.steps[step];
    if (part.reveal && !graded) {
      graded = true;
      part.reveal({
        playReference(events) { play(events); },
        grade(correct) { record(correct,correct ? 1/(1+listens) : 0); advance(); focusQuestion(); }
      });
      restoredGrade = 'reveal';
      saveDraft();
      return;
    }
    if (selected === null && !part.check) return;
    const finalStep = step === question.steps.length - 1;
    if (graded) {
      if (finalStep) advance();
      else { step++; restoredGrade = undefined; render(); saveDraft(); }
      focusQuestion();
      return;
    }
    graded = true;
    const assessment = part.evaluate ? part.evaluate() : assess([{label:question.steps.length>1?(step===0?'Función del acorde':'Sensible'):'Respuesta',correct:part.check ? part.check() : part.options[selected]===part.answer,given:part.options?.[selected],answer:part.answer}]);
    const {correct,earned,total,items} = assessment;
    outcomes[step] = {correct,earned,total,items:part.evaluate||question.steps.length>1?items:[],errors:correct ? [] : part.diagnose ? part.diagnose() : [`Elegiste «${part.options?.[selected] || 'sin respuesta'}»; era «${part.answer}»`]};
    [...$('answers').children].forEach((button,i)=>{
      button.disabled = true;
      if (part.options[i] === part.answer) button.classList.add('good');
      else if (i === selected) button.classList.add('bad');
    });
    lockStaff();
    for (const input of $('editor').querySelectorAll('select, button')) input.disabled = true;
    if (part.solution) {
      $('notation').hidden = false;
      showSolution(part.solution,part.compare,assessment.notation);
    }
    $('feedback').textContent = (correct ? '¡Correcto! ' : 'Respuesta: ' + part.answer + '. ') + (part.explanation || '');
    if(finalStep)showAnswerReview($('editor'),outcomes,$('answer-review'),{mistakesOnly:Boolean(assessment.notation?.notes)});
    firstCorrect &&= correct;
    if (finalStep && !replaying) record(firstCorrect,combinedCredit(outcomes));
    restoredGrade = 'checked';
    saveDraft();
    $('next').textContent = finalStep ? 'Siguiente ejercicio →' : 'Identificar sensible →';
  }
  function record(correct,credit=Number(correct)) {
    const result = stats[mode] ||= {right:0,total:0};
    result.credit = (result.credit ?? result.right) + credit;
    result.total++;
    if (correct) result.right++;
    writeCookie(statsKey,stats);
    recordAttempt({mode,correct,credit,context:question.context || '',selfAssessed:Boolean(question.steps[step].reveal),
      errors:correct ? [] : [...new Set(outcomes.flatMap(item=>item?.errors || []).concat(outcomes.some(item=>!item?.correct) ? [] : [question.steps[step].reveal ? 'Autoevaluación: necesita práctica' : 'Ejercicio sin completar']))]});
    progress();
  }
  function focusQuestion() {
    const prompt = $('prompt');
    prompt.tabIndex = -1;
    prompt.focus();
  }

  $('arpeggio').checked = Boolean(preferences.arpeggio);
  $('arpeggio').addEventListener('change',()=>{
    preferences.arpeggio = $('arpeggio').checked;
    savePreferences();
  });
  $('play').addEventListener('click',()=>play());
  $('listen-melody').addEventListener('click',()=>play(question.fullMelody,()=>{
    listens++;
    saveDraft();
    $('listen-count').textContent = 'Escuchas de la melodía: '+listens;
  }));
  $('next').addEventListener('click',()=>submit());
  $('skip').addEventListener('click',()=>{
    if (practiceActive() && (!graded || step < question.steps.length-1 || question.steps[step].reveal)) record(false,combinedCredit(question.steps.map((part,index)=>outcomes[index]||{earned:0,total:part.evaluate?.().total??1})));
    advance();
    focusQuestion();
  });
  $('meter-choice').addEventListener('change',()=>newQuestion());
  $('key-practice').addEventListener('change',()=>newQuestion());
  $('rhythm-pitches').addEventListener('change',()=>newQuestion());
  $('progression-sevenths').addEventListener('change',()=>newQuestion());
  $('progression-octave').addEventListener('change',()=>newQuestion());
  $('progression-count').addEventListener('change',()=>newQuestion());
  window.addEventListener('keydown',event=>{
    if (document.getElementById('practice-page')?.hidden || document.querySelector('.workspace-main[inert]') || suspended || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target.matches('input, select, textarea, summary')) return;
    const index = ['a','b','c','d'].indexOf(event.key.toLowerCase());
    if (index >= 0) choose(index);
    if (event.key === ' ' && !$('listen').hidden && !event.target.closest('button, #notation')) { event.preventDefault(); play(); }
  });
  [9,16,26,14,35,23,41,31,18,28,12,7].forEach((height,index)=>{
    const bar=document.createElement('i');
    bar.style.setProperty('--h',height+'px');
    bar.style.setProperty('--d',index*.06+'s');
    document.querySelector('.bars').append(bar);
  });

  return {
    get mode() { return mode; },
    stats,
    stopAudio,
    open(id) {
      mode = id;
      const restore = pending.mode===id ? pending : undefined;
      pending = {};
      newQuestion(restore);
    },
    focus:focusQuestion,
    suspend(value) { suspended = value; if (value) stopAudio(); },
    refreshSound() { stopAudio(); sound = nextSound(); displaySound(); saveDraft(); }
  };
}
