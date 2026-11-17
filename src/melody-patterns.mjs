import { pick } from './dom.mjs';
import { midi } from './music.mjs';
import { sumNotes, tupletNotes, tupletSpan, soundingNotes } from './score-model.mjs';

export function generateMelody(meter,pitches,tonic,barCount=4) {
  barCount=Number(barCount)===2?2:4;
  const capacity=meter.beats*meter.unit;
  const feature=pick(['syncopation','group2','group3','group4','group5','crossTie']);
  const target=pick(Array.from({length:barCount-1},(_,index)=>index));
  let last=tonic,groupId=1;
  const regular=()=>({pitch:last,length:1});
  const measures=Array.from({length:barCount},(_,bar)=>{
    const notes=[];
    if(bar===target&&feature==='syncopation') {
      notes.push(...[1,1,1,1].map(length=>({pitch:last,length})));
      notes[1].tie=true;
    } else if(bar===target&&feature.startsWith('group')) {
      const size=Number(feature.slice(5));
      notes.push(...tupletNotes(size,tupletSpan(size,meter.unit),last,groupId++));
    }
    while(sumNotes(notes)<capacity-1e-8) {
      const offset=sumNotes(notes),remaining=capacity-offset;
      const choices=['0.5','0.5','1','1','2','2','3','group2','group3','group4','group5'].filter(value=>{
        const span=value.startsWith('group') ? tupletSpan(Number(value.slice(5)),meter.unit) : Number(value);
        return span<=remaining+1e-8&&(!value.startsWith('group')||Math.abs(offset/meter.unit-Math.round(offset/meter.unit))<1e-8);
      });
      const tool=pick(choices);
      const newNotes=tool.startsWith('group') ? tupletNotes(Number(tool.slice(5)),tupletSpan(Number(tool.slice(5)),meter.unit),last,groupId++) : [{...regular(),length:Number(tool)}];
      for(const note of newNotes) {
        note.pitch=last;
        last=pick(pitches.filter(pitch=>Math.abs(pitch-last)<=2));
      }
      notes.push(...newNotes);
    }
    return notes;
  });
  measures.at(-1).at(-1).pitch=tonic;
  // Keep tied notes at the same pitch, including across a barline.
  const notes=measures.flat();
  notes.forEach((note,index)=>{if(note.tie) notes[index+1].pitch=note.pitch;});
  if(feature==='crossTie'||pick([true,false,false])) {
    const bar=pick(Array.from({length:barCount-1},(_,index)=>index));
    const from=measures[bar].at(-1),to=measures[bar+1][0];
    from.tie=true;to.pitch=from.pitch;
    // An incoming tie can change a note that already starts another tie.
    notes.forEach((note,index)=>{if(note.tie&&notes[index+1]) notes[index+1].pitch=note.pitch;});
  }
  return measures;
}
// Short, stepwise phrases for initial sight-singing practice.
export function generateSingingMelody(meter,tonic) {
  const measures=Array.from({length:2},(_,bar)=>{
    const split=meter.unit===2&&meter.beats<4&&pick([true,false,false]) ? pick(Array.from({length:meter.beats-(bar===1?1:0)},(_,i)=>i)) : -1;
    return Array.from({length:meter.beats},(_,beat)=>(beat===split?[1,1]:[meter.unit]).map(length=>({pitch:tonic,length}))).flat();
  });
  const notes=measures.flat();let previous=tonic;
  notes.forEach((note,index)=>{
    const remaining=notes.length-index-1;
    const choices=Array.from({length:5},(_,i)=>tonic+i).filter(pitch=>Math.abs(pitch-previous)<=1&&pitch-tonic<=remaining);
    note.pitch=index===0?tonic:pick(choices);previous=note.pitch;
  });
  return measures;
}

export function melodyEvents(measures,meter,start=meter.beats) {
  let offset=start;
  return soundingNotes(measures.flat()).flatMap(({pitch,length,rest})=>{
    const duration=length/meter.unit;
    const event=[midi(pitch),offset,duration*.96,.16];
    offset+=duration;return rest?[]:[event];
  });
}
