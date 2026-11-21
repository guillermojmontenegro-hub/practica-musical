import { pick } from './dom.mjs';
import { generateMelody, pulseMelody } from './melody-patterns.mjs';

export const solfegeLevels = {
  beginner:{label:'Inicial',description:'Grados conjuntos y ritmos simples',step:1},
  intermediate:{label:'Intermedio',description:'Saltos de tercera y subdivisiones del pulso',step:2},
  advanced:{label:'Avanzado',description:'Saltos de cuarta, síncopas y grupos irregulares',step:3}
};

// Diatonic coordinates relative to middle C (Do4). Register is independent of level.
export const solfegeRanges={fa:[-14,0],sol:[0,14],both:[-14,14]};

export function generateSolfege(meter,{type='sightRead',clef='sol',difficulty='beginner'}={}) {
  const level=solfegeLevels[difficulty]||solfegeLevels.beginner;
  const count=type==='sightSing'&&difficulty==='beginner'?2:4;
  const [low,high]=solfegeRanges[clef];
  const pitches=Array.from({length:high-low+1},(_,i)=>low+i);
  // Start throughout the available register, including its two endpoints.
  const tonic=pick(pitches);
  let measures;
  if(difficulty==='advanced') measures=generateMelody(meter,[tonic],tonic,count);
  else measures=pulseMelody(meter,tonic,count,difficulty==='intermediate');
  let previous=tonic;
  let direction=tonic<(low+high)/2?1:-1;
  const plan=[];
  measures.forEach((bar,index)=>{
    // Switch near middle C when the phrase reaches the other register,
    // rather than pulling every bar back to middle C to force a switch.
    const staff=clef==='both'?(previous<0||previous===0&&direction<0?'fa':'sol'):clef;
    plan.push(staff);
    const bottom=clef==='both'?(staff==='fa'?low:-1):low;
    const top=clef==='both'?(staff==='fa'?1:high):high;
    bar.forEach((note,n)=>{
      const candidates=pitches.filter(pitch=>pitch>=bottom&&pitch<=top&&Math.abs(pitch-previous)<=level.step);
      if(index===0&&n===0)note.pitch=tonic;
      else {
        if(previous===low)direction=1;
        if(previous===high)direction=-1;
        const forward=candidates.filter(pitch=>(pitch-previous)*direction>0);
        // Favor a broad phrase contour while retaining occasional repetitions and turns.
        note.pitch=pick(forward.length? [...forward,...forward,...candidates]:candidates);
      }
      previous=note.pitch;
      delete note.tie;
    });
  });
  if(difficulty==='advanced') measures.forEach(bar=>{
    const index=bar.findIndex((note,i)=>i+1<bar.length&&note.pitch===bar[i+1].pitch);
    if(index>=0)bar[index].tie=true;
  });
  return {measures,plan};
}
