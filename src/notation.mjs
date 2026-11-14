import React, { useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Renderer, Stave, StaveNote, Formatter, Voice, Beam, Tuplet, StaveTie, Dot, Glyph, TimeSignature, Fraction } from 'vexflow';
import { clefs, mod, figureDefinitions } from './music.mjs';

// Keep notation as data until the React component commits.
export function staff(options) { return structuredClone(options); }
export function pitchKey(pitch) {
  return `${['c','d','e','f','g','a','b'][mod(pitch,7)]}/${4+Math.floor(pitch/7)}`;
}
export function noteDuration(note) {
  if(note.tuplet) return String(8/(note.tuplet.innerLength??(note.tuplet.size<=3?1:.5)))+(note.dotted?'d':'');
  const figure=figureDefinitions[note.length];
  if(!figure) throw new Error(`Figura sin representación: ${note.length}`);
  return figure.duration;
}
const svgNS = 'http://www.w3.org/2000/svg';
function overlay(svg, tag, attributes) {
  const element = document.createElementNS(svgNS,tag);
  for (const [key,value] of Object.entries(attributes)) element.setAttribute(key,String(value));
  svg.append(element);
}
export function drawStaff(host, score) {
  const {clef='sol',signs=[],symbol='',measures=[],label='',rhythm=false,edit,active=0,backing=[],guides=[],selected=null,editNotes=false,activeVoice=0,showMeter=true}=score;
  const meter=score.meter||{top:4,bottom:4,beats:4,unit:2};
  let secondary=score.secondaryMeasures??null;
  if(!secondary&&backing.length) secondary=backing.map(bar=>bar.map((_,index)=>({pitch:4,length:meter.unit/2,...(meter.unit===3?{tuplet:{size:2,span:3,id:Math.floor(index/2)}}:{})})));
  const sources=secondary?[measures,secondary]:[measures];
  host.replaceChildren();
  const header=105+signs.length*20;
  const barWidth=Math.max(210,...sources.flatMap(bars=>bars.map(notes=>notes.length*34+28)));
  const count=Math.max(1,measures.length),width=Math.max(590,header+barWidth*count+15),height=secondary?300:180;
  const renderer=new Renderer(host,Renderer.Backends.SVG);renderer.resize(width,height);
  const context=renderer.getContext();context.setFillStyle('currentColor').setStrokeStyle('currentColor');
  const svg=host.querySelector('svg');svg.setAttribute('viewBox',`0 -25 ${width} ${height}`);svg.setAttribute('class','staff');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);svg.style.minWidth=`${width}px`;
  const y=pitch=>76-(pitch-clefs[clef].bottom)*5;
  const available=(width-header-15)/count;
  const rendered=sources.map(()=>[]);
  function engrave(source,voice) {
    const notes=source.map(note=>{
      const result=new StaveNote({clef:voice===0&&clef==='fa'&&!rhythm?'bass':'treble',keys:voice===1?['b/4/x2']:[pitchKey(note.pitch)],duration:noteDuration(note),...(voice===1?{stem_direction:-1}:{auto_stem:true})});
      if(note.dotted||(!note.tuplet&&figureDefinitions[note.length]?.dot)) Dot.buildAndAttach([result]);
      return result;
    });
    const tuplets=[];
    for(let n=0;n<source.length;n++) if(source[n].tuplet) {
      const group=source[n].tuplet,size=group.size;if(n+size>source.length)continue;
      const base=parseInt(noteDuration(source[n]),10),span=group.baseSpan??group.span??meter.unit;
      const occupied=span*base/8;
      if(size!==occupied)tuplets.push(new Tuplet(notes.slice(n,n+size),{num_notes:size,notes_occupied:occupied,bracketed:true,...(voice===1?{location:Tuplet.LOCATION_BOTTOM}:{})}));
      n+=size-1;
    }
    return {notes,tuplets};
  }
  for(let bar=0;bar<count;bar++) {
    const x=bar===0?10:header+bar*available,end=header+(bar+1)*available;
    const stacks=sources.map((bars,voice)=>{
      const stave=new Stave(x,-4+voice*100,end-x).setContext(context);
      if(bar===0)stave.addClef(rhythm||voice===1?'percussion':clef==='fa'?'bass':'treble');
      const group=context.openGroup(`voice-${voice+1}-staff`);group.setAttribute('data-voice',String(voice+1));group.setAttribute('data-bar',String(bar));stave.draw();context.closeGroup();
      if(bar===0){
        if(voice===0)signs.forEach((pitch,index)=>Glyph.renderGlyph(context,49+index*20,y(pitch),38,symbol==='♭'?'accidentalFlat':'accidentalSharp'));
        if(showMeter)new TimeSignature(`${meter.top}/${meter.bottom}`).setStave(stave).setX(53+signs.length*20).setContext(context).draw();
      }
      stave.setNoteStartX(header+bar*available+12);
      const {notes,tuplets}=engrave(bars[bar]||[],voice);
      const music=notes.length?new Voice({num_beats:meter.top,beat_value:meter.bottom}).setStrict(false).addTickables(notes):null;
      rendered[voice].push(notes);return {notes,tuplets,music,stave};
    });
    const voices=stacks.map(stack=>stack.music).filter(Boolean);
    if(voices.length){const formatter=new Formatter();voices.forEach(voice=>formatter.joinVoices([voice]));formatter.format(voices,available-35);}
    stacks.forEach(({notes,tuplets,music,stave},voice)=>{
      if(!music)return;
      const beams=Beam.generateBeams(notes,{groups:[new Fraction(meter.unit,8)],...(voice===1?{maintain_stem_directions:true}:{})});
      music.draw(context,stave);beams.forEach(beam=>beam.setContext(context).draw());tuplets.forEach(tuplet=>tuplet.setContext(context).draw());
    });
    guides.forEach(pitch=>overlay(svg,'path',{class:'staff-guide',d:`M${header+bar*available} ${y(pitch)}H${end}`}));
    if(secondary) for(let beat=0;beat<meter.beats;beat++) {
      const text=document.createElementNS(svgNS,'text');text.setAttribute('x',String(header+bar*available+12+beat*(available-35)/meter.beats));text.setAttribute('y','248');text.setAttribute('class','pulse-label');text.setAttribute('data-pulse',String(beat+1));text.setAttribute('data-pulse-bar',String(bar));text.textContent=String(beat+1);svg.append(text);
    }
  }
  if(secondary)for(const [voice,label] of [[0,'Voz 1'],[1,'Voz 2']]){
    const text=document.createElementNS(svgNS,'text');text.setAttribute('x','10');text.setAttribute('y',String(18+voice*100));text.setAttribute('class','voice-label');text.textContent=label;svg.append(text);
  }
  sources.forEach((bars,voice)=>bars.forEach((notes,bar)=>notes.forEach((note,index)=>{
    if(!note.tie)return;
    const first=rendered[voice][bar][index],last=rendered[voice][bar][index+1]||rendered[voice][bar+1]?.[0];
    if(last&&note.pitch===(notes[index+1]||bars[bar+1]?.[0])?.pitch)new StaveTie({first_note:first,last_note:last,first_indices:[0],last_indices:[0]}).setContext(context).draw();
  })));
  if(edit){
    const areas=edit==='signs'?[{x:44,width:width-59}]:measures.map((_,bar)=>({x:header+bar*available,width:available}));
    sources.forEach((_,voice)=>areas.forEach((area,bar)=>overlay(svg,'rect',{class:`staff-hit ${bar===active&&voice===activeVoice?'staff-active':''}`,'data-staff-bar':bar,'data-staff-voice':voice,x:area.x,y:10+voice*100,width:area.width,height:105,stroke:'none'})));
    if(editNotes&&edit==='signs')signs.forEach((pitch,index)=>overlay(svg,'rect',{class:`staff-note-hit ${index===selected?'note-selected':''}`,'data-note-bar':0,'data-note-voice':0,'data-note-index':index,'data-pitch':pitch,x:44+index*20,y:y(pitch)-14,width:20,height:30,rx:4,fill:'transparent',stroke:'none'}));
    else if(editNotes)sources.forEach((bars,voice)=>rendered[voice].forEach((notes,bar)=>notes.forEach((note,index)=>{
      const value=bars[bar][index];
      overlay(svg,'rect',{class:`staff-note-hit ${bar===active&&voice===activeVoice&&index===selected?'note-selected':''}`,'data-note-bar':bar,'data-note-voice':voice,'data-note-index':index,'data-pitch':value.pitch,'data-length':value.length,'data-tie':Boolean(value.tie),'data-dotted':Boolean(value.dotted??figureDefinitions[value.length]?.dot),'data-group':value.tuplet?.size||'',x:note.getNoteHeadBeginX()-7,y:note.getYs()[0]-15,width:26,height:30,rx:5,fill:'transparent',stroke:'none'});
    })));
    const area=areas[active]||areas[0];if(area)overlay(svg,'line',{class:'staff-cursor',x1:area.x+4,x2:area.x+area.width-4,y1:56+activeVoice*100,y2:56+activeVoice*100});
  }
}
export function Staff({score}) {
  const ref=useRef(null);
  useLayoutEffect(()=>{drawStaff(ref.current,score);},[score]);
  return React.createElement('div',{className:'score',ref});
}
let root;
let current;
export function setNotation(score) {
  current=score;
  root ||= createRoot(document.getElementById('notation'));
  flushSync(()=>root.render(score ? React.createElement(Staff,{score}) : null));
}
export function showSolution(score,compare=false) {
  const before={...current,edit:false,editNotes:false,selected:null};
  current=score;
  root ||= createRoot(document.getElementById('notation'));
  flushSync(()=>root.render(compare ? React.createElement(React.Fragment,null,
    React.createElement('p',{className:'staff-label'},'Tu transcripción'),React.createElement(Staff,{score:before}),
    React.createElement('p',{className:'staff-label'},'Referencia'),React.createElement(Staff,{score})) : React.createElement(Staff,{score})));
}

// Draw the same engraved symbols used in scores, without relying on a music font installed by the user.
export function figureIcon(host,length) {
  const renderer=new Renderer(host,Renderer.Backends.SVG);renderer.resize(32,40);
  const context=renderer.getContext();context.setFillStyle('currentColor').setStrokeStyle('currentColor');
  Glyph.renderGlyph(context,6,31,28,'noteheadBlack');
  context.beginPath().moveTo(14,30).lineTo(14,6).setLineWidth(1.3).stroke();
  if(figureDefinitions[length].flag) Glyph.renderGlyph(context,14,6,28,figureDefinitions[length].flag);
  if(figureDefinitions[length].dot) context.beginPath().arc(23,29,1.6,0,Math.PI*2).fill();
  host.querySelector('svg').setAttribute('aria-hidden','true');
}
