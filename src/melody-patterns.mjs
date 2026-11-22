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

export function pulseMelody(meter,tonic,barCount,subdivide,syncopatedBar=-1) {
  return Array.from({length:barCount},(_,bar)=>Array.from({length:meter.beats},(_,beat)=>{
    // Anticipate the second pulse by an eighth note and release an eighth after it.
    if(bar===syncopatedBar) {
      if(beat===0) return [{pitch:tonic,length:meter.unit-1},{pitch:tonic,length:1,tie:true}];
      if(beat===1) return [{pitch:tonic,length:1},{pitch:tonic,length:meter.unit-1}];
    }
    const split=subdivide&&pick([true,false]);
    return (split?(meter.unit===3?[1,2]:[1,1]):[meter.unit]).map(length=>({pitch:tonic,length}));
  }).flat());
}

// Offsets in scale steps: a scale fragment, a turn, a broken triad and two leaps with a return.
const dictationMotifs=[[0,1,2],[0,2,1],[0,2,4],[0,3,2],[0,3,1]];
const cadencePatterns=[[[0]],[[1,0],[-1,0]],[[2,1,0],[-2,-1,0],[1,-1,0]]];

function phraseDictation(attacks,pitches,tonic) {
  const motifs=[];
  for(const shape of dictationMotifs) for(const start of pitches) for(const direction of [-1,1]) {
    const notes=shape.map(offset=>start+direction*offset);
    if(notes.every(pitch=>pitches.includes(pitch))&&Math.abs(midi(notes[1])-midi(start))<=5) {
      motifs.push({shape,notes});
    }
  }
  const cadenceLength=1+(attacks.length-1)%3;
  const cadences=cadencePatterns[cadenceLength-1].map(pattern=>pattern.map(offset=>tonic+offset))
    .filter(notes=>notes.every(pitch=>pitches.includes(pitch)));
  const phrase=[];
  let shapeToEcho;
  const joins=(from,to)=>from!==to&&Math.abs(from-to)<=2;
  while(phrase.length<attacks.length-cadenceLength) {
    const lastMotif=phrase.length+3===attacks.length-cadenceLength;
    const candidates=motifs.filter(({notes})=>
      (phrase.length?joins(phrase.at(-1),notes[0]):notes[0]===tonic)&&
      (!lastMotif||cadences.some(ending=>joins(notes[2],ending[0]))));
    // Answer each opening motif with its shape at another height or in the opposite direction.
    const echoes=candidates.filter(({shape})=>shape===shapeToEcho);
    const choices=echoes.length?echoes:candidates;
    const wider=choices.filter(({notes})=>notes.some(pitch=>!phrase.includes(pitch)));
    const motif=pick(wider.length?wider:choices);
    phrase.push(...motif.notes);
    shapeToEcho=shapeToEcho?undefined:motif.shape;
  }
  phrase.push(...pick(cadences.filter(ending=>joins(phrase.at(-1),ending[0]))));
  attacks.forEach((note,index)=>{note.pitch=phrase[index];});
}

export const currentDictationVersion=3;
export function generateDictation(meter,pitches,tonic,barCount,difficulty,version=currentDictationVersion) {
  if(difficulty==='advanced'&&version===1) return generateMelody(meter,pitches,tonic,barCount);
  const subdivide=difficulty==='intermediate'||difficulty==='advanced';
  const syncopatedBar=difficulty==='advanced'&&pick([true,false])
    ? pick(Array.from({length:barCount},(_,i)=>i)) : -1;
  const measures=pulseMelody(meter,tonic,barCount,subdivide,syncopatedBar);
  const notes=measures.flat();
  const attacks=notes.filter((note,index)=>!notes[index-1]?.tie);
  if(difficulty==='advanced'&&version>=3) {
    phraseDictation(attacks,pitches,tonic);
  } else {
    const step=subdivide?2:1;
    let previous=tonic;
    // Leave enough steps to return to the reference note without a final leap.
    for(let index=1;index<attacks.length;index++) {
      const remaining=attacks.length-index-1;
      const choices=pitches.filter(pitch=>Math.abs(pitch-previous)<=step&&Math.abs(pitch-tonic)<=remaining*step);
      attacks[index].pitch=pick(choices);
      previous=attacks[index].pitch;
    }
  }
  if(syncopatedBar>=0) {
    const bar=measures[syncopatedBar];
    bar[2].pitch=bar[1].pitch;
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
