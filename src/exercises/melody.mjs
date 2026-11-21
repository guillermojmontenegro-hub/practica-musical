import { generateSolfege, solfegeLevels } from '../solfege.mjs';
import { generateDictation, melodyEvents } from '../melody-patterns.mjs';
import { createScoreEditor, groupTools, soundingTimeline, sumNotes } from '../score-model.mjs';
import { transcriptionErrors } from '../diagnostics.mjs';
import { transcriptionAssessment } from '../grading.mjs';
import { $, pick } from '../dom.mjs';
import { clefs, clefLabel, baseFigureTools, pitchLabel, midi, selectClef, selectMeter, meterLabel, countIn } from '../music.mjs';
import { staffEditor } from '../staff-editor.mjs';
import { staff } from '../notation.mjs';

const melodyNames = measures => measures.map(notes=>notes.map(note=>pitchLabel(note.pitch)).join(' – ')).join(' | ');
// One count-in per bar, so the student can keep the pulse while reading.
function readingEvents(measures,meter,shift=0) {
  const pulse = countIn(meter);
  return Array.from({length:measures.length+1},(_,bar)=>pulse.map(([note,time,length,volume,voice])=>[
    note,time + bar*meter.beats,length,volume,voice
  ])).flat().map(([note,time,length,volume,voice])=>[note,time+shift,length,volume,voice]);
}
const referenceEvents = (measures,meter) => [...countIn(meter),...melodyEvents(measures,meter)];
// Self-assessed reading step: the written answer plus an optional audio reference.
function readingStep(prompt,names,reference) {
  return {prompt,reveal(actions){
    $('feedback').textContent = names;
    if (reference) {
      const button = document.createElement('button');
      button.className = 'skip';
      button.textContent = 'Escuchar la referencia';
      button.addEventListener('click',()=>actions.playReference(reference));
      $('feedback').append(document.createElement('br'),button);
    }
    $('next').hidden = true;
    for (const [label,correct] of [['Me falta practicar',false],['Me salió bien',true]]) {
      const button = document.createElement('button');
      button.className = correct ? 'next' : 'skip';
      button.textContent = label;
      button.addEventListener('click',()=>{actions.grade(correct);});
      $('feedback').append(' ',button);
    }
  }};
}

function solfegeQuestion(type,{clef=selectClef(),difficulty=$('sight-difficulty')?.value}={}) {
  if(!solfegeLevels[difficulty])difficulty='beginner';
  const meter=selectMeter();
  const {measures,plan}=generateSolfege(meter,{type,clef,difficulty});
  const both=clef==='both';
  const level=solfegeLevels[difficulty];
  const context=`${both?'Claves de sol y fa':`Clave de ${clefLabel(clef)}`} · ${meterLabel(meter)} · ${level.label}: ${level.description} · ${both?'Do2–Do6':clef==='fa'?'Do2–Do4':'Do4–Do6'}`;
  const notation=staff({clef:both?'sol':clef,meter,measures,
    ...(both?{staffPlan:plan}:{}),label:`${context}, melodía de ${measures.length} compases`});
  const reference=referenceEvents(measures,meter);
  const singing=type==='sightSing';
  const count=measures.length===2?'dos':'cuatro';
  return {context,notation,
    events:singing?[[midi(measures[0][0].pitch),0,.72,.16],...readingEvents(measures,meter,1)]:readingEvents(measures,meter),
    fullMelody:singing?reference:undefined,
    steps:[readingStep(`${singing?'Cantá':'Leé'} los ${count} compases${singing?'':' en voz alta'}${both?' y seguí la melodía de un pentagrama al otro':''}.`,melodyNames(measures),singing?undefined:reference)]};
}

function melodyQuestion(type,options={}) {
  if(type==='sightRead'||type==='sightSing')return solfegeQuestion(type,options);
  const {barCount,difficulty=$('dictation-difficulty')?.value}=options;
  const level=Object.hasOwn(solfegeLevels,difficulty)?difficulty:'beginner';
  const clef = pick(Object.keys(clefs));
  const meter = selectMeter();
  const {bottom} = clefs[clef];
  const pitches = Array.from({length:8},(_,i)=>bottom+i);
  const tonic = clef === 'sol' ? 7 : -7;
  const count=Number(barCount??$('dictation-bars')?.value)===4?4:2;
  const measures = generateDictation(meter,pitches,tonic,count,level);
  const context = `Clave de ${clefLabel(clef)} · ${meter.top}/${meter.bottom} · ${solfegeLevels[level].label}`;
  const solution = staff({clef,meter,measures,label:`${context}, melodía de ${measures.length} compases`});
  const pulse = countIn(meter);
  const melody = melodyEvents(measures,meter);
  const reference = [[midi(tonic),0,.72,.16]];
  const listening = [...pulse,...melody].map(([note,time,length,volume,voice])=>[note,time+1,length,volume,voice]);
  return {context:context + ` · ${count} compases · Nota de referencia: ` + pitchLabel(tonic),
    notation:staff({clef,meter,measures:measures.map(()=>[]),label:context}),
    events:[...reference,...listening],steps:[dictationStep(measures,pitches,meter,solution,clef)]};
}

function dictationStep(measures,pitches,meter,solution,clef) {
  const groups = measures.map(()=>[]);
  const capacity = meter.beats*meter.unit;
  const model=createScoreEditor(groups,{capacity,unit:meter.unit,pitchFromPosition:position=>clefs[clef].bottom+position,allowedPitches:pitches});
  return {
    prompt:'Transcribí la melodía.',
    answer:'Compará tu transcripción con la melodía de referencia',
    solution,compare:true,
    diagnose:()=>transcriptionErrors(groups,measures,{rhythm:true}),
    check:()=>soundingTimeline(groups.flat())===soundingTimeline(measures.flat()),
    evaluate:()=>transcriptionAssessment([groups],[measures]),
    editor(container) {
      staffEditor(container,{
        tools:[...baseFigureTools,...groupTools],
        draw:active=>staff({clef,meter,measures:groups,pitches,edit:true,active,label:'Transcripción de melodía'}),
        ready:model.ready,
        status:bar=>`Compás ${bar+1} · ${Number(sumNotes(groups[bar]).toFixed(2))} de ${capacity} corcheas`,
        place:model.apply,
        undo:model.undo,
        editable:true
      });
    }
  };
}

export { melodyQuestion };
