import { figureDefinitions } from './music.mjs';
const epsilon=1e-8;
const powerOfTwo=value=>value>0&&Math.abs(Math.log2(value)-Math.round(Math.log2(value)))<epsilon;

// Duration values are measured in eighth notes. Choose a conventional written
// subdivision independently of the legacy glyph hints saved in older drafts.
export function tupletSpelling(note) {
  const {size}=note.tuplet;
  const span=note.tuplet.span??note.length*size;
  if(![2,3,4,5].includes(size)||!Number.isFinite(span)||span<=0) throw new Error('Grupo irregular inválido.');
  let occupied;
  if(powerOfTwo(span)) occupied=2**Math.floor(Math.log2(size));
  else if(powerOfTwo(span/3)) occupied=size===5?6:3;
  else {
    let inner=2**Math.floor(Math.log2(span/size));
    while(Math.abs(span/inner-Math.round(span/inner))>epsilon) inner/=2;
    occupied=Math.round(span/inner);
  }
  const innerLength=span/occupied;
  const denominator=8/innerLength;
  if(!Number.isInteger(denominator)||!powerOfTwo(denominator)) throw new Error('El grupo no tiene una figura representable.');
  return {size,span,occupied,innerLength,duration:String(denominator),irregular:size!==occupied};
}
export function noteSpelling(note) {
  if(note.rest){const spec=noteSpelling({...note,rest:false});return {...spec,duration:spec.duration+'r'};}
  if(note.tuplet) return {...tupletSpelling(note),dots:0};
  const figure=figureDefinitions[note.length];
  if(!figure) throw new Error(`Figura sin representación: ${note.length}`);
  return {duration:figure.duration,dots:figure.dot?1:0,innerLength:figure.baseLength??note.length};
}
export function tupletRanges(notes) {
  const ranges=[];
  for(let index=0;index<notes.length;index++) {
    const note=notes[index];if(!note.tuplet)continue;
    const spelling=tupletSpelling(note),group=notes.slice(index,index+spelling.size);
    if(group.length!==spelling.size||group.some(member=>!member.tuplet||member.tuplet.size!==spelling.size||member.tuplet.id!==note.tuplet.id||Math.abs(member.length-spelling.span/spelling.size)>epsilon)) throw new Error('Grupo irregular incompleto o inconsistente.');
    ranges.push({start:index,end:index+spelling.size,...spelling});index+=spelling.size-1;
  }
  return ranges;
}
