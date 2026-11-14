import { figureDefinitions } from './music.mjs';
const epsilon=1e-8;
export const sumNotes=notes=>notes.reduce((sum,note)=>sum+note.length,0);
export const tupletSpan=(size,unit)=>size===2||size===4 ? 3 : size===3 ? 2 : unit;
export const groupTools=[['group2','Dosillo'],['group3','Tresillo'],['group4','Cuatricillo'],['group5','Quintillo']];
export function tupletNotes(size,span,pitch=6,id=0) {
  const tuplet={size,span,id};
  return Array.from({length:size},()=>({pitch,length:span/size,tuplet}));
}
export function soundingNotes(notes) {
  const result=[];
  notes.forEach((note,index)=>{
    const previous=notes[index-1];
    if(previous?.tie&&!previous.rest&&!note.rest&&previous.pitch===note.pitch) result.at(-1).length+=note.length;
    else result.push({pitch:note.pitch,length:note.length,...(note.rest?{rest:true}:{})});
  });
  return result;
}
export const soundingTimeline=notes=>soundingNotes(notes).map(n=>`${n.rest?'r':n.pitch}:${Math.round(n.length*1000000)}`).join(',');
function repairTies(measures,capacity) {
  const notes=measures.flat();
  notes.forEach((note,index)=>{if(note.tie&&(note.rest||notes[index+1]?.rest||note.pitch!==notes[index+1]?.pitch)) delete note.tie;});
  measures.forEach(bar=>{if(sumNotes(bar)<capacity-epsilon&&bar.length) delete bar.at(-1).tie;});
}
function groupRange(notes,index) {
  const group=notes[index]?.tuplet;
  if(!group) return [index,1];
  let start=index;
  while(start>0&&notes[start-1].tuplet?.id===group.id) start--;
  return [start,group.size];
}
export function createScoreEditor(measures,{capacity,unit,pitchFromPosition,allowedPitches,spanForGroup=size=>tupletSpan(size,unit)}) {
  const history=[];
  let groupId=1;
  const fail=message=>({ok:false,message});
  function commit(before,index=null) {history.push(before);repairTies(measures,capacity);return {ok:true,index};}
  return {
    measures,
    ready:()=>measures.every(notes=>Math.abs(sumNotes(notes)-capacity)<epsilon),
    apply(bar,position,tool,index=null) {
      const notes=measures[bar];
      if(!notes) return fail('Elegí un compás válido.');
      const selected=Number.isInteger(index)&&index>=0&&index<notes.length;
      const before=structuredClone(measures);
      if(tool==='delete') {
        if(!selected) return fail('Seleccioná la nota que querés eliminar.');
        const [start,count]=groupRange(notes,index);
        notes.splice(start,count);
        return commit(before);
      }
      if(tool==='rest') {
        if(!selected) return fail('Seleccioná una figura para modificarla.');
        notes[index].rest=!notes[index].rest;
        return commit(before,index);
      }
      const silent=tool.startsWith('r@');
      if(silent) tool=tool.slice(2);
      if(tool==='tie') {
        // With no selection, preserve the previous editor's "last two" shortcut.
        const from=selected ? index : notes.length-2;
        const first=notes[from];
        const next=notes[from+1] || (from===notes.length-1 ? measures[bar+1]?.[0] : null);
        if(!first||!next) return fail('Cargá la nota siguiente antes de agregar la ligadura.');
        if(from===notes.length-1&&sumNotes(notes)<capacity-epsilon) return fail('Completá este compás antes de ligar con el siguiente.');
        if(first.rest||next.rest) return fail('Las ligaduras unen notas, no silencios.');
        if(first.pitch!==next.pitch) return fail('La ligadura de prolongación une notas de la misma altura.');
        first.tie=!first.tie;
        return commit(before,selected?index:null);
      }
      if(tool==='dot'||tool==='ungroup'||/^n[2345]$/.test(tool)) {
        if(!selected) return fail('Seleccioná una nota para modificarla.');
        const [start,count]=groupRange(notes,index),current=notes[index];
        const base=current.tuplet?.baseSpan??(current.tuplet?.span??figureDefinitions[current.length]?.baseLength??current.length);
        const dotted=current.tuplet?Boolean(current.tuplet.dotted):Boolean(current.dotted??figureDefinitions[current.length]?.dot);
        const size=current.tuplet?.size||0;
        const nextSize=tool==='dot'?size:tool==='ungroup'?0:Number(tool.slice(1))===size?0:Number(tool.slice(1));
        const nextDot=tool==='dot'?!dotted:dotted;
        const length=base*(nextDot?1.5:1);
        if(sumNotes(notes)-sumNotes(notes.slice(start,start+count))+length>capacity+epsilon) return fail('El modificador excede la duración del compás.');
        let replacement;
        if(nextSize) {
          replacement=tupletNotes(nextSize,length,current.pitch,groupId++);
          const meta=replacement[0].tuplet;Object.assign(meta,{baseSpan:base,dotted:nextDot});
          replacement.forEach(note=>{note.dotted=nextDot;});
        } else replacement=[{pitch:current.pitch,length,baseLength:base,dotted:nextDot}];
        replacement.forEach(note=>{if(current.rest)note.rest=true;});
        if(notes[start+count-1]?.tie) replacement.at(-1).tie=true;
        notes.splice(start,count,...replacement);
        return commit(before,start);
      }
      const pitch=pitchFromPosition(position);
      if(allowedPitches&&!allowedPitches.includes(pitch)) return fail('Esa altura está fuera del registro del ejercicio.');
      const modifier=/^n([2345])@([\d.]+)@([01])$/.exec(tool);
      const dottedFigure=/^d@([\d.]+)$/.exec(tool);
      const size=modifier?Number(modifier[1]):tool.startsWith('group')?Number(tool.slice(5)):0;
      if(size&&![2,3,4,5].includes(size)) return fail('Elegí un grupo válido.');
      const base=modifier?Number(modifier[2]):dottedFigure?Number(dottedFigure[1]):Number(tool);
      const dotted=modifier?modifier[3]==='1':Boolean(dottedFigure);
      const length=modifier?base*(dotted?1.5:1):dottedFigure?base*1.5:size?spanForGroup(size):Number(tool);
      if(!Number.isFinite(length)||length<=0||(!size&&!figureDefinitions[length])) return fail('Elegí una figura.');
      // A member of a tuplet keeps its own pitch; changing its figure replaces the entire group.
      if(selected&&size&&notes[index].tuplet?.size===size&&Math.abs(notes[index].tuplet.span-length)<epsilon) {
        notes[index].pitch=pitch;notes[index].rest=silent;
        return commit(before,index);
      }
      const [start,count]=selected ? groupRange(notes,index) : [notes.length,0];
      const removed=sumNotes(notes.slice(start,start+count));
      if(sumNotes(notes)-removed+length>capacity+epsilon) return fail('La figura no entra en este compás. Acortá o eliminá otra nota primero.');
      const replacement=size ? tupletNotes(size,length,pitch,groupId++) : [{pitch,length,...(dottedFigure?{baseLength:base,dotted:true}:{})}];
      if(modifier) {
        Object.assign(replacement[0].tuplet,{baseSpan:base,dotted});
        replacement.forEach(note=>{note.dotted=dotted;});
      }
      replacement.forEach(note=>{if(silent)note.rest=true;});
      if(selected&&notes[start+count-1]?.tie) replacement.at(-1).tie=true;
      notes.splice(start,count,...replacement);
      return commit(before,selected?start:null);
    },
    undo() {
      const previous=history.pop();
      if(!previous) return fail('No hay cambios para deshacer.');
      measures.splice(0,measures.length,...previous);
      return {ok:true,index:null};
    }
  };
}

export function createVoiceEditors(voices,options) {
  const models=voices.map((measures,voice)=>createScoreEditor(measures,typeof options==='function'?options(voice):options));
  const history=[];
  return {
    ready:()=>models.every(model=>model.ready()),
    apply(bar,position,tool,index=null,voice=0) {
      const result=models[voice]?.apply(bar,position,tool,index);
      if(result?.ok) history.push(voice);
      return result||{ok:false,message:'Elegí una voz válida.'};
    },
    undo() {
      const voice=history.pop();if(voice===undefined)return {ok:false,message:'No hay cambios para deshacer.'};
      return {...models[voice].undo(),voice};
    }
  };
}
