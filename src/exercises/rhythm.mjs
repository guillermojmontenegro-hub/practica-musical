import { rhythmEvents } from '../rhythm-playback.mjs';
import { createVoiceEditors, soundingTimeline, tupletNotes as makeTuplet } from '../score-model.mjs';
import { transcriptionErrors } from '../diagnostics.mjs';
import { $, pick } from '../dom.mjs';
import { selectMeter, meterLabel, figures, baseFigureTools } from '../music.mjs';
import { staffEditor } from '../staff-editor.mjs';
import { staff } from '../notation.mjs';

function barPattern(meter, syncopated) {
  const patterns = meter.unit === 2 ? [[2],[1,1],[.5,.5,.5,.5],[1,.5,.5],[.5,.5,1]] : [[3],[2,1],[1,2],[1,1,1],[1,.5,.5,1]];
  const beats = Array.from({length:meter.beats},()=>[...pick(patterns)]);
  if (syncopated) {
    const beat = pick(Array.from({length:meter.beats-1},(_,index)=>index));
    const lead = pick(Array.from({length:meter.unit-1},(_,index)=>index+1));
    beats[beat] = [lead,meter.unit-lead];
    const held = pick(Array.from({length:meter.unit},(_,index)=>index+1));
    beats[beat+1] = held === meter.unit ? [held] : [held,meter.unit-held];
    const notes = beats.flat().map(length=>({length,pitch:6}));
    notes[beats.slice(0,beat+1).flat().length-1].tie = true;
    return notes;
  }
  return beats.flat().map(length=>({length,pitch:6}));
}

const groups = [[2,'Dosillo'],[3,'Tresillo'],[4,'Cuatricillo'],[5,'Quintillo']];
const sum = bar => bar.reduce((total,note)=>total+note.length,0);
const close = (a,b) => Math.abs(a-b)<1e-8;
const timeline = soundingTimeline;
function tupletNotes(size,unit) {
  const tuplet = {size};
  return Array.from({length:size},()=>({pitch:6,length:unit/size,tuplet}));
}

function rhythmQuestion(type='syncopation') {
  const meter = selectMeter();
  const context = meterLabel(meter);
  const targetBar = pick([0,1]);
  const poly = type==='poly';
  const twoVoices = poly || $('rhythm-pitches').value==='2';
  const upper = 6;
  const lower = 4;
  const polyBass = 4;
  const size = type==='tuplet' ? pick(meter.unit===2 ? [3,5] : [2,4,5]) : poly ? 3 : 0;
  const capacity = meter.beats*meter.unit;
  const measures = [0,1].map(index=>{
    const regular = barPattern(meter,type==='syncopation' && index===targetBar);
    if (!size || index!==targetBar) return regular;
    const start = pick(Array.from({length:meter.beats},(_,beat)=>beat))*meter.unit;
    let offset = 0;
    return regular.flatMap(note=>{
      const at = offset;
      offset += note.length;
      if (at===start) return tupletNotes(size,meter.unit);
      return at>start && at<start+meter.unit ? [] : [note];
    });
  });
  const backing = poly ? measures.map(()=>Array.from({length:meter.beats*2},(_,index)=>index*meter.unit/2)) : [];
  const secondary=twoVoices?measures.map(()=>poly
    ? Array.from({length:meter.beats},(_,beat)=>meter.unit===3?makeTuplet(2,3,lower,100+beat):[{pitch:lower,length:1},{pitch:lower,length:1}]).flat()
    : barPattern(meter,false).map(note=>({...note,pitch:lower}))) : null;
  const entered=[[],[]],enteredSecond=twoVoices?[[],[]]:null;
  const voices=twoVoices?[entered,enteredSecond]:[entered];
  const model=createVoiceEditors(voices,voice=>({capacity,unit:meter.unit,pitchFromPosition:()=>voice===0?upper:lower,spanForGroup:()=>meter.unit}));
  const draw = (notes,second,label,active,activeVoice=0)=>staff({clef:'sol',meter,measures:notes,secondaryMeasures:second,label,rhythm:true,backing,edit:active!==undefined,active,activeVoice});
  const events=rhythmEvents(measures,meter,backing,polyBass,secondary);
  const solution=draw(measures,secondary,'Ritmo de referencia en '+context);
  const tools = [...baseFigureTools];

  if (size) tools.push(...groups.map(([number,label])=>['group'+number,label]));
  return {context:`${context} · ${meter.beats} pulsos por compás · ${meter.unit} corcheas por pulso` + (poly ? ` · Acompañamiento: 2 golpes por pulso (${meter.beats*2} por compás)` : twoVoices ? ' · Dos voces' : ' · Una voz'),rhythmPitches:!poly,events,notation:draw(entered,enteredSecond,'Transcripción rítmica'),steps:[{
    prompt:twoVoices ? 'Transcribí las dos voces.' : 'Transcribí el ritmo.',
    check:()=>timeline(entered.flat())===timeline(measures.flat())&&(!twoVoices||timeline(enteredSecond.flat())===timeline(secondary.flat())),
    answer:'Compará tu transcripción con el ritmo de referencia',
    solution,compare:true,
    diagnose:()=>[...(timeline(entered.flat())===timeline(measures.flat())?[]:transcriptionErrors(entered,measures,{rhythm:true}).map(error=>twoVoices?`Voz 1: ${error}`:error)),...(twoVoices&&timeline(enteredSecond.flat())!==timeline(secondary.flat())?transcriptionErrors(enteredSecond,secondary,{rhythm:true}).map(error=>`Voz 2: ${error}`):[])],
    explanation:type==='syncopation' ? `La síncopa está en el compás ${targetBar+1}: la nota cruza el pulso.`
      : `${poly&&meter.unit===3 ? 'Tres corcheas por pulso' : groups.find(([number])=>number===size)[1]} en el compás ${targetBar+1}. ${poly ? 'Tres ataques de la voz melódica coinciden con dos golpes del acompañamiento en el mismo pulso.' : 'El grupo divide un pulso en partes iguales.'}`,
    editor(container) {
      staffEditor(container,{
        tools,
        draw:(active,voice)=>draw(entered,enteredSecond,'Tu transcripción de ritmo',active,voice),
        ready:model.ready,
        status:(bar,voice)=>`${twoVoices?`Voz ${voice+1} · `:''}Compás ${bar+1} · ${Number(sum(voices[voice||0][bar]).toFixed(2))} de ${capacity} corcheas`,
        place:model.apply,
        undo:model.undo,
        editable:true
      });
    }
  }]};
}

export { rhythmQuestion };
