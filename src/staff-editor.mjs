import { setNotation, figureIcon } from './notation.mjs';
import { $ } from './dom.mjs';
import { clefs, pitchLabel, figureDefinitions } from './music.mjs';

function staffEditor(container,{tools,draw,ready,place,undo,status,editable=false}) {
  const panel=$('notation');
  let tool=tools[0][0],active=0,cursor=4,selected=null,error='',drag=null,skipClick=false,voice=0,dotted=false,division=0;
  const draft=container.staffDraft||[];
  for(const [bar,position,id,index,savedVoice] of draft) {
    if(id===null) undo(bar,savedVoice??0);else place(bar,position,id,index??null,savedVoice??0);
    active=bar;cursor=position;voice=savedVoice??0;
  }
  const toolbar=document.createElement('div');toolbar.className='score-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Herramientas de partitura');
  const output=document.createElement('p');output.className='editor-help';output.setAttribute('role','status');
  function button(label,symbol,action) {
    const node=document.createElement('button');node.type='button';node.className='score-tool';node.title=label;node.setAttribute('aria-label',label);
    const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=symbol;node.append(icon);node.addEventListener('click',action);return node;
  }
  function records(score) {return score.edit==='signs' ? score.signs.map(pitch=>({pitch})) : (voice===1?score.secondaryMeasures:score.measures)[active];}
  function position(pitch,score) {return score.rhythm ? 4 : pitch-clefs[score.clef].bottom;}
  function selectNote(bar,index,selectedVoice=voice) {
    voice=selectedVoice;active=bar;selected=index;error='';
    const score=draw(active,voice),note=records(score)[selected];
    if(note) {
      cursor=position(note.pitch,score);
      if(score.edit==='signs') tool=score.symbol;
      else {
        tool=String(note.tuplet?.baseSpan??note.tuplet?.span??note.baseLength??figureDefinitions[note.length]?.baseLength??note.length);
        dotted=note.tuplet?Boolean(note.tuplet.dotted):Boolean(note.dotted??figureDefinitions[note.length]?.dot);division=note.tuplet?.size||0;
      }
    }
    update();
  }
  function edit(id) {
    const result=id===null?undo(active,voice):place(active,cursor,id,selected,voice);
    if(result?.ok===false) {error=result.message;update();return false;}
    draft.push([active,cursor,id,selected,voice]);container.saveStaffDraft?.();error='';
    if(result&&'index' in result) selected=result.index;
    if(result?.voice!==undefined) voice=result.voice;
    update();return true;
  }
  function action() {return division?`n${division}@${tool}@${dotted?1:0}`:dotted?`d@${tool}`:tool;}
  function choose(value) {tool=value;error='';if(selected!==null||value==='none') edit(action());else update();}
  function refreshSelection() {if(selected!==null)selectNote(active,selected,voice);else update();}
  const choices=[];
  const grouped=tools.filter(([value])=>value.startsWith('group'));
  for(const [value,label] of tools.filter(([value])=>!value.startsWith('group')&&!figureDefinitions[value]?.dot).sort((a,b)=>Number(b[0])-Number(a[0]))) {
    const node=button(label,value==='none'?'∅':value,()=>choose(value));
    if(Number(value)>0) {node.replaceChildren();figureIcon(node,Number(value));}
    node.dataset.tool=value;toolbar.append(node);choices.push([value,node]);
  }
  const groups=document.createElement('select');groups.className='group-tool';groups.setAttribute('aria-label','Grupo irregular');groups.title='Grupo irregular';
  groups.add(new Option('ⁿ',''));
  for(const [value,label] of grouped) {const option=new Option(value.slice(5),`n${value.slice(5)}`);option.title=label;option.setAttribute('aria-label',label);groups.add(option);}
  groups.addEventListener('change',()=>{const next=Number(groups.value.slice(1))||0;if(next===division){update();return;}if(selected!==null){edit(next?`n${next}`:'ungroup');refreshSelection();}else{division=next;update();}});
  if(grouped.length) toolbar.append(groups);
  const dot=button('Puntillo','·',()=>{if(selected!==null){edit('dot');refreshSelection();}else{dotted=!dotted;update();}});
  if(tools.some(([value])=>Number(value)>0))toolbar.insertBefore(dot,grouped.length?groups:null);
  const lower=button('Bajar nota','↓',()=>movePitch(-1));
  const higher=button('Subir nota','↑',()=>movePitch(1));
  const tie=button('Ligar con siguiente','⌒',()=>edit('tie'));
  const remove=button('Eliminar nota','×',()=>{edit('delete');selected=null;update();});
  const back=button('Deshacer','↶',()=>{edit(null);selected=null;update();});
  toolbar.append(lower,higher,tie,remove,back);
  const navigation=document.createElement('div');navigation.className='score-navigation';
  const previous=button('Compás anterior','‹',()=>changeBar(-1));
  const next=button('Compás siguiente','›',()=>changeBar(1));
  const barLabel=document.createElement('output');barLabel.className='score-position';
  navigation.append(previous,barLabel,next);
  const voices=document.createElement('div');voices.className='voice-switch';voices.setAttribute('role','group');voices.setAttribute('aria-label','Voz a editar');
  const voiceButtons=[0,1].map(index=>{const node=button(`Voz ${index+1}`,String(index+1),()=>{voice=index;selected=null;error='';update();showActive();});voices.append(node);return node;});
  navigation.prepend(voices);
  container.append(toolbar,navigation,output);
  function showActive() {
    const area=panel.querySelector(`[data-staff-bar="${active}"][data-staff-voice="${voice}"]`);if(!area) return;
    const bounds=area.getBoundingClientRect(),viewport=panel.getBoundingClientRect();panel.scrollLeft+=bounds.left-viewport.left-12;
  }
  function changeBar(delta) {active+=delta;selected=null;error='';update();showActive();}
  function validPosition(value,score) {
    if(score.rhythm) return score.guides?.length ? value<3?2:4 : 4;
    const pitches=score.pitches || Array.from({length:14},(_,i)=>clefs[score.clef].bottom+i-2);
    return position(pitches.reduce((best,pitch)=>Math.abs(position(pitch,score)-value)<Math.abs(position(best,score)-value)?pitch:best,pitches[0]),score);
  }
  function movePitch(delta) {
    const score=draw(active,voice);cursor=validPosition(cursor+(score.rhythm?delta*2:delta),score);error='';
    if(selected!==null) edit(action());else update();
  }
  function update() {
    const score=draw(active,voice),notes=records(score);
    if(selected!==null&&!notes[selected]) selected=null;
    score.selected=selected;score.editNotes=editable;score.activeVoice=voice;
    if(drag?.moved&&selected!==null) {
      const pitch=score.rhythm?(cursor<3?4:6):clefs[score.clef].bottom+cursor;
      if(score.edit==='signs') score.signs[selected]=pitch;else (voice===1?score.secondaryMeasures:score.measures)[active][selected].pitch=pitch;
    }
    setNotation(score);
    const bars=score.edit==='signs'?1:score.measures.length;
    previous.disabled=active===0;next.disabled=active>=bars-1;navigation.hidden=bars<=1;
    barLabel.textContent=`Compás ${active+1} de ${bars}`;
    for(const [id,node] of choices) node.setAttribute('aria-pressed',String(id===tool));
    groups.value=division?`n${division}`:'';
    dot.setAttribute('aria-pressed',String(dotted));
    dot.disabled=score.edit==='signs';
    voices.hidden=score.secondaryMeasures==null;voiceButtons.forEach((node,index)=>node.setAttribute('aria-pressed',String(index===voice)));
    const pitched=score.edit==='signs'||!score.rhythm||score.guides?.length;
    lower.hidden=higher.hidden=selected===null||!pitched;
    tie.hidden=selected===null||score.edit==='signs';remove.hidden=selected===null;
    const step=score.rhythm?2:1;
    lower.disabled=validPosition(cursor-step,score)===cursor;higher.disabled=validPosition(cursor+step,score)===cursor;
    tie.setAttribute('aria-pressed',String(Boolean(notes[selected]?.tie)));
    tie.setAttribute('aria-label',notes[selected]?.tie?'Quitar ligadura':'Ligar con siguiente');tie.title=tie.getAttribute('aria-label');
    remove.setAttribute('aria-label',notes[selected]?.tuplet?'Eliminar grupo':'Eliminar nota');remove.title=remove.getAttribute('aria-label');
    const marker=panel.querySelector('.staff-cursor');marker?.setAttribute('y1',76+voice*100-cursor*5);marker?.setAttribute('y2',76+voice*100-cursor*5);
    $('next').disabled=!ready();
    output.textContent=(status?.(active,voice)||'')+(selected!==null?` · ${pitchLabel(notes[selected].pitch)} seleccionada`:'')+(error?` · ${error}`:'');output.dataset.error=String(Boolean(error));
  }
  panel.tabIndex=0;
  panel.setAttribute('aria-label','Editor de partitura. Tocá para escribir, seleccioná una nota y usá símbolos o arrastrá para editar. Flechas para compás y altura; Intro para escribir; Suprimir para eliminar.');
  panel.onclick=event=>{
    if(skipClick) {skipClick=false;return;}
    if(event.target.closest('[data-note-index]')) return; // Note taps and drags are handled by pointer events.
    const target=event.target.closest('[data-staff-bar]');if(!target) return;
    const svg=target.ownerSVGElement,point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(svg.getScreenCTM().inverse());active=Number(target.dataset.staffBar);voice=Number(target.dataset.staffVoice||0);selected=null;cursor=validPosition(Math.round((76+voice*100-local.y)/5),draw(active,voice));edit(action());
  };
  panel.onpointerdown=event=>{
    const target=event.target.closest('[data-note-index]');skipClick=Boolean(target);if(!target||event.button>0) return;
    const bar=Number(target.dataset.noteBar),index=Number(target.dataset.noteIndex),selectedVoice=Number(target.dataset.noteVoice||0);
    const wasSelected=active===bar&&selected===index&&voice===selectedVoice;
    selectNote(bar,index,selectedVoice);
    const svg=panel.querySelector('svg'),scale=svg.getBoundingClientRect().height/svg.viewBox.baseVal.height;
    drag={bar,index,y:event.clientY,cursor,scale,moved:false,wasSelected};panel.setPointerCapture(event.pointerId);
  };
  panel.onpointermove=event=>{
    if(!drag) return;
    const delta=(drag.y-event.clientY)/(5*drag.scale);
    if(Math.abs(delta)<1&&!drag.moved) return;
    drag.moved=true;cursor=validPosition(Math.round(drag.cursor+delta),draw(active,voice));update();
  };
  panel.onpointerup=event=>{
    if(!drag) return;
    const finished=drag;drag=null;
    if(panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId);
    if(finished.moved) edit(action());else {if(finished.wasSelected) selected=null;update();}
  };
  panel.onpointercancel=()=>{drag=null;skipClick=false;update();};
  panel.onkeydown=event=>{
    const bars=panel.querySelectorAll(`[data-staff-bar][data-staff-voice="${voice}"]`).length;
    if(event.key==='ArrowLeft') {active=Math.max(0,active-1);selected=null;}
    else if(event.key==='ArrowRight') {active=Math.min(bars-1,active+1);selected=null;}
    else if(event.key==='ArrowUp'||event.key==='ArrowDown') movePitch(event.key==='ArrowUp'?1:-1);
    else if(event.key==='Enter'||event.key===' ') edit(action());
    else if(event.key==='Delete'&&editable&&selected!==null) {edit('delete');selected=null;}
    else if(event.key==='Backspace') {edit(null);selected=null;}
    else if(event.key==='Escape') selected=null;
    else return;
    event.preventDefault();update();showActive();
  };
  update();
}
function lockStaff() {
  const panel=$('notation');
  for(const name of ['onclick','onkeydown','onpointerdown','onpointermove','onpointerup','onpointercancel']) panel[name]=null;
  panel.removeAttribute('tabindex');panel.removeAttribute('aria-label');
}
export { staffEditor, lockStaff };
