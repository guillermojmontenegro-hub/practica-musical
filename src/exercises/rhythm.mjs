import { rhythmEvents } from '../rhythm-playback.mjs';
import { createVoiceEditors, soundingTimeline, groupTools, tupletNotes as makeTuplet } from '../score-model.mjs';
import { transcriptionErrors } from '../diagnostics.mjs';
import { transcriptionAssessment } from '../grading.mjs';
import { $, pick } from '../dom.mjs';
import { selectMeter, meterLabel, figures, baseFigureTools } from '../music.mjs';
import { staffEditor } from '../staff-editor.mjs';
import { staff } from '../notation.mjs';

const beatPatterns=unit=>unit===2?[[2],[1,1],[.5,.5,.5,.5],[1,.5,.5],[.5,.5,1]]:[[3],[2,1],[1,2],[1,1,1],[1,.5,.5,1]];
function barPattern(meter, syncopated) {
  const patterns=beatPatterns(meter.unit);
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

function secondVoiceBar(meter,primary,dupleBeat=null) {
  const patterns=beatPatterns(meter.unit);
  const variations=meter.unit===2?[[1,.5,.5],[.5,1,.5],[.5,.5,1]]:[[1,.5,.5,1],[.5,.5,2],[2,.5,.5]];
  const beats=Array.from({length:meter.beats},()=>pick(patterns).map(length=>({pitch:4,length})));
  // A contrasting beat guarantees an independent rhythm, even in 2/4 and 6/8.
  const varied=dupleBeat===null?pick(Array.from({length:meter.beats},(_,i)=>i)):(dupleBeat+1)%meter.beats;
  const rhythm=notes=>notes.map(({length,tie})=>`${length}:${Boolean(tie)}`).join(',');
  const start=pick([0,1,2]);
  for(const pattern of [...variations.slice(start),...variations.slice(0,start)]){
    beats[varied]=pattern.map(length=>({pitch:4,length}));
    if(dupleBeat!==null)beats[dupleBeat]=meter.unit===3?makeTuplet(2,3,4,100):[{pitch:4,length:1},{pitch:4,length:1}];
    const result=beats.flat();
    if(rhythm(result)!==rhythm(primary))return result;
  }
  return beats.flat();
}

const groups=groupTools.map(([id,label])=>[Number(id.slice(5)),label]);
const sum = bar => bar.reduce((total,note)=>total+note.length,0);
const close = (a,b) => Math.abs(a-b)<1e-8;
const timeline = soundingTimeline;
function tupletNotes(size,unit) {
  const tuplet = {size};
  return Array.from({length:size},()=>({pitch:6,length:unit/size,tuplet}));
}

function rhythmQuestion(type='syncopation',{signature}={}) {
  const meter = selectMeter(signature);
  const context = meterLabel(meter);
  const targetBar = pick([0,1]);
  const poly = type==='poly';
  const twoVoices = poly || $('rhythm-pitches').value==='2';
  const upper = 6;
  const lower = 4;
  let groupBeat=0;
  const size = type==='tuplet' ? pick(meter.unit===2 ? [3,5] : [2,4,5]) : poly ? 3 : 0;
  const capacity = meter.beats*meter.unit;
  const measures = [0,1].map(index=>{
    const regular = barPattern(meter,type==='syncopation' && index===targetBar);
    if (!size || index!==targetBar) return regular;
    const start = pick(Array.from({length:meter.beats},(_,beat)=>beat))*meter.unit;
    if(index===targetBar)groupBeat=start/meter.unit;
    let offset = 0;
    return regular.flatMap(note=>{
      const at = offset;
      offset += note.length;
      if (at===start) return tupletNotes(size,meter.unit);
      return at>start && at<start+meter.unit ? [] : [note];
    });
  });
  const secondary=twoVoices?measures.map((bar,index)=>secondVoiceBar(meter,bar,poly&&index===targetBar?groupBeat:null)):null;
  const entered=[[],[]],enteredSecond=twoVoices?[[],[]]:null;
  const voices=twoVoices?[entered,enteredSecond]:[entered];
  const model=createVoiceEditors(voices,voice=>({capacity,unit:meter.unit,pitchFromPosition:()=>voice===0?upper:lower,spanForGroup:()=>meter.unit}));
  const draw = (notes,second,label,active,activeVoice=0)=>staff({clef:'sol',meter,measures:notes,secondaryMeasures:second,label,rhythm:true,edit:active!==undefined,active,activeVoice});
  const events=rhythmEvents(measures,meter,[],lower,secondary);
  const solution=draw(measures,secondary,'Ritmo de referencia en '+context);
  const tools = [...baseFigureTools,...groupTools];
  return {context:`${context} · ${meter.beats} pulsos por compás · ${meter.unit} corcheas por pulso` + (poly ? ` · Dos voces · 3 contra 2 en un pulso` : twoVoices ? ' · Dos voces' : ' · Una voz'),rhythmPitches:!poly,events,notation:draw(entered,enteredSecond,'Transcripción rítmica'),steps:[{
    prompt:twoVoices ? 'Transcribí las dos voces.' : 'Transcribí el ritmo.',
    check:()=>timeline(entered.flat())===timeline(measures.flat())&&(!twoVoices||timeline(enteredSecond.flat())===timeline(secondary.flat())),
    evaluate:()=>transcriptionAssessment(voices,twoVoices?[measures,secondary]:[measures],{rhythm:true}),
    answer:'Compará tu transcripción con el ritmo de referencia',
    solution,compare:true,
    diagnose:()=>[...(timeline(entered.flat())===timeline(measures.flat())?[]:transcriptionErrors(entered,measures,{rhythm:true}).map(error=>twoVoices?`Voz 1: ${error}`:error)),...(twoVoices&&timeline(enteredSecond.flat())!==timeline(secondary.flat())?transcriptionErrors(enteredSecond,secondary,{rhythm:true}).map(error=>`Voz 2: ${error}`):[])],
    explanation:type==='syncopation' ? `La síncopa está en el compás ${targetBar+1}: la nota cruza el pulso.`
      : `${poly&&meter.unit===3 ? 'Tres corcheas por pulso' : groups.find(([number])=>number===size)[1]} en el compás ${targetBar+1}. ${poly ? 'Tres ataques del redoblante coinciden con dos del platillo en ese pulso; ambas voces tienen su propio ritmo.' : 'El grupo divide un pulso en partes iguales.'}`,
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
