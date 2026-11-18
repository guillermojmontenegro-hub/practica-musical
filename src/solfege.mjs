import { pick } from './dom.mjs';
import { generateMelody, generateSingingMelody } from './melody-patterns.mjs';

export const solfegeLevels = {
  beginner:{label:'Inicial',description:'Grados conjuntos y ritmos simples',step:1,radius:4},
  intermediate:{label:'Intermedio',description:'Saltos de tercera y subdivisiones del pulso',step:2,radius:7},
  advanced:{label:'Avanzado',description:'Saltos de cuarta, síncopas y grupos irregulares',step:3,radius:9}
};

// Each bar belongs to exactly one staff: the other staff remains empty.
export function generateSolfege(meter,{type='sightRead',clef='sol',difficulty='beginner'}={}) {
  const level=solfegeLevels[difficulty]||solfegeLevels.beginner;
  const count=type==='sightSing'&&difficulty==='beginner'?2:4;
  const first=clef==='both'?pick(['sol','fa']):clef;
  const plan=Array.from({length:count},(_,bar)=>clef==='both'&&
    (difficulty==='advanced'?bar%2:bar>=count/2)?(first==='sol'?'fa':'sol'):first);
  const tonic=clef==='both'?0:first==='sol'?0:-7;
  // Keep the established short, stepwise introduction to singing.
  if(type==='sightSing'&&difficulty==='beginner'&&clef!=='both')
    return {measures:generateSingingMelody(meter,tonic),plan};
  let measures;
  if(difficulty==='advanced') measures=generateMelody(meter,[tonic],tonic,count);
  else measures=Array.from({length:count},()=>Array.from({length:meter.beats},()=>{
    const split=difficulty==='intermediate'&&pick([true,false]);
    return (split?(meter.unit===3?[1,2]:[1,1]):[meter.unit]).map(length=>({pitch:tonic,length}));
  }).flat());
  let previous=tonic;
  measures.forEach((bar,index)=>{
    const low=clef==='both'?(plan[index]==='fa'?-level.radius:-1):tonic;
    const high=clef==='both'?(plan[index]==='fa'?1:level.radius):tonic+level.radius;
    bar.forEach((note,n)=>{
      const remaining=bar.length-n-1+(clef==='both'?0:measures.slice(index+1).flat().length);
      const end=clef==='both'?0:tonic;
      const candidates=Array.from({length:high-low+1},(_,i)=>low+i).filter(pitch=>
        Math.abs(pitch-previous)<=level.step&&
        // Return near middle C before each transfer; finish single-staff phrases on the tonic.
        Math.abs(pitch-end)<=remaining*level.step);
      note.pitch=index===0&&n===0?tonic:pick(candidates);
      previous=note.pitch;
      // Rebuild ties only when their generated pitches actually agree.
      delete note.tie;
    });
  });
  if(difficulty==='advanced') measures.forEach(bar=>{
    const index=bar.findIndex((note,i)=>i+1<bar.length&&note.pitch===bar[i+1].pitch);
    if(index>=0)bar[index].tie=true;
  });
  return {measures,plan};
}
