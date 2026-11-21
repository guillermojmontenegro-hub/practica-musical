import { pick } from './dom.mjs';
import { midi } from './music.mjs';
import { sumNotes, tupletNotes, tupletSpan, soundingNotes } from './score-model.mjs';

// Diatonic steps that stay within one added ledger line for each staff. The
// shared Si3-Re4 window is where a melody moves from one pentagram to the other.
export const staffRanges={fa:[-9,1],sol:[-1,9]};
const crossoverRange=[-4,4];
const crossStaffPitches=Array.from({length:staffRanges.sol[1]-staffRanges.fa[0]+1},(_,index)=>staffRanges.fa[0]+index);
const otherStaff=clef=>clef==='fa'?'sol':'fa';
const clampRange=(value,[low,high])=>Math.min(Math.max(value,low),high);
// The last bar of a run stays near the shared window so the hand-off leap stays small.
function staffBounds(plan,bar) {
  const current=staffRanges[plan[bar]];
  if(!plan[bar+1]||plan[bar]===plan[bar+1]) return current;
  return [Math.max(current[0],crossoverRange[0]),Math.min(current[1],crossoverRange[1])];
}
// One change of staff per phrase: the clef each bar belongs to.
function pickStaffPlan(barCount) {
  const first=pick(['fa','sol']);
  const split=pick(Array.from({length:barCount-1},(_,index)=>index+1));
  return Array.from({length:barCount},(_,bar)=>bar<split?first:otherStaff(first));
}

export function pulseMelody(meter,tonic,barCount,subdivide) {
  return Array.from({length:barCount},()=>Array.from({length:meter.beats},()=>{
    const split=subdivide&&pick([true,false]);
    return (split?(meter.unit===3?[1,2]:[1,1]):[meter.unit]).map(length=>({pitch:tonic,length}));
  }).flat());
}

export function generateDictation(meter,pitches,tonic,barCount,difficulty) {
  if(difficulty==='advanced') return generateMelody(meter,pitches,tonic,barCount);
  const subdivide=difficulty==='intermediate';
  const measures=pulseMelody(meter,tonic,barCount,subdivide);
  const notes=measures.flat();
  const step=subdivide?2:1;
  let previous=tonic;
  // Leave enough steps to return to the reference note without a final leap.
  for(let index=1;index<notes.length;index++) {
    const remaining=notes.length-index-1;
    const choices=pitches.filter(pitch=>Math.abs(pitch-previous)<=step&&Math.abs(pitch-tonic)<=remaining*step);
    notes[index].pitch=pick(choices);
    previous=notes[index].pitch;
  }
  return measures;
}

export function generateMelody(meter,pitches,tonic,barCount=4,{plan=null}={}) {
  barCount=Number(barCount)===2?2:4;
  const capacity=meter.beats*meter.unit;
  const feature=pick(['syncopation','group2','group3','group4','group5','crossTie']);
  const target=pick(Array.from({length:barCount-1},(_,index)=>index));
  let last=tonic,groupId=1;
  const regular=()=>({pitch:last,length:1});
  const measures=Array.from({length:barCount},(_,bar)=>{
    const notes=[];
    const bounds=plan?staffBounds(plan,bar):null;
    if(bounds) last=clampRange(last,bounds);
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
        last=pick(pitches.filter(pitch=>Math.abs(pitch-last)<=2&&(!bounds||pitch>=bounds[0]&&pitch<=bounds[1])));
      }
      notes.push(...newNotes);
    }
    return notes;
  });
  measures.at(-1).at(-1).pitch=tonic;
  // Keep tied notes at the same pitch, including across a barline.
  const notes=measures.flat();
  notes.forEach((note,index)=>{if(note.tie) notes[index+1].pitch=note.pitch;});
  // A tie may only cross a barline when both bars share the same staff.
  const crossings=Array.from({length:barCount-1},(_,index)=>index).filter(index=>!plan||plan[index]===plan[index+1]);
  if(crossings.length&&(feature==='crossTie'||pick([true,false,false]))) {
    const bar=pick(crossings);
    const from=measures[bar].at(-1),to=measures[bar+1][0];
    from.tie=true;to.pitch=from.pitch;
    // An incoming tie can change a note that already starts another tie.
    notes.forEach((note,index)=>{if(note.tie&&notes[index+1]) notes[index+1].pitch=note.pitch;});
  }
  return measures;
}

// A single phrase that starts in one staff and continues in the other.
export function generateCrossStaffMelody(meter,barCount=4) {
  const plan=pickStaffPlan(barCount);
  const measures=generateMelody(meter,crossStaffPitches,0,barCount,{plan});
  const systems=[];
  plan.forEach((clef,bar)=>{
    const current=systems.at(-1);
    if(current&&current.clef===clef) current.measures.push(measures[bar]);
    else systems.push({clef,measures:[measures[bar]]});
  });
  const changeBar=plan.findIndex(clef=>clef!==plan[0]);
  return {measures,systems,plan,changeBar};
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
