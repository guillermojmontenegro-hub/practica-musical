import { generateMelody, generateSingingMelody, melodyEvents } from '../melody-patterns.mjs';
import { createScoreEditor, groupTools, soundingTimeline, sumNotes } from '../score-model.mjs';
import { transcriptionErrors } from '../diagnostics.mjs';
import { $, pick } from '../dom.mjs';
import { clefs, clefLabel, figures, baseFigureTools, pitchLabel, midi, selectMeter, countIn } from '../music.mjs';
import { staffEditor } from '../staff-editor.mjs';
import { staff } from '../notation.mjs';

function melodyQuestion(type) {
  const clef = pick(Object.keys(clefs));
  const meter = selectMeter();
  const {bottom} = clefs[clef];
  const pitches = Array.from({length:8},(_,i)=>bottom+i);
  const tonic = clef === 'sol' ? (type==='sightSing'?0:7) : -7;
  const measures = type==='sightSing' ? generateSingingMelody(meter,tonic) : generateMelody(meter,pitches,tonic);
  const context = `Clave de ${clefLabel(clef)} · ${meter.top}/${meter.bottom}`;
  const solution = staff({clef,meter,measures,label:`${context}, melodía de ${measures.length} compases`});
  const pulse = countIn(meter);
  const melody = melodyEvents(measures,meter);
  if (type === 'dictation') {
    const reference = [[midi(tonic),0,.72,.16]];
    const listening = [...pulse,...melody].map(([note,time,length,volume,voice])=>[note,time+1,length,volume,voice]);
    return {context:context + ' · Nota de referencia: ' + pitchLabel(tonic),
      notation:staff({clef,meter,measures:[[],[],[],[]],label:context}),
      events:[...reference,...listening],steps:[dictationStep(measures,pitches,meter,solution,clef)]};
  }
  const names = measures.map(notes=>notes.map(note=>pitchLabel(note.pitch)).join(' – ')).join(' | ');
  const readingPulse = Array.from({length:measures.length+1},(_,bar)=>pulse.map(([note,time,length,volume,voice])=>[
    note,time + bar*meter.beats,length,volume,voice
  ])).flat();
  const events = type === 'sightSing'
    ? [[midi(tonic),0,.72,.16],...readingPulse.map(([note,time,length,volume,voice])=>[note,time+1,length,volume,voice])]
    : readingPulse;
  return {context,notation:solution,events,fullMelody:type==='sightSing' ? [...pulse,...melody] : undefined,steps:[{
    prompt:type === 'sightRead' ? 'Leé los cuatro compases en voz alta.' : 'Cantá los dos compases.',
    reveal(actions){
      $('feedback').textContent = names;
      const reference = document.createElement('button');
      reference.className = 'skip';
      reference.textContent = 'Escuchar la referencia';
      reference.addEventListener('click',()=>actions.playReference([...pulse,...melody]));
      if (type==='sightRead') $('feedback').append(document.createElement('br'),reference);
      $('next').hidden = true;
      for (const [label,correct] of [['Me falta practicar',false],['Me salió bien',true]]) {
        const button = document.createElement('button');
        button.className = correct ? 'next' : 'skip';
        button.textContent = label;
        button.addEventListener('click',()=>{actions.grade(correct);});
        $('feedback').append(' ',button);
      }
    }
  }]};
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
