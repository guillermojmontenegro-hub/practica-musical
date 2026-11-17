import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';

function snapshot(select) {
  const options=[...select.options].map(option=>({value:option.value,label:option.label,disabled:option.disabled}));
  const label=select.getAttribute('aria-label')||[...(select.closest('label')?.childNodes||[])].filter(node=>node.nodeType===3||node.nodeType===1&&node.tagName==='SPAN'&&!node.classList.contains('custom-select-host')).map(node=>node.textContent.trim()).filter(Boolean).join(' ')||select.title||'Seleccionar';
  return {options,value:select.value,disabled:select.disabled,label};
}
export function CustomSelect({select}) {
  const [state,setState]=useState(()=>snapshot(select));
  const [open,setOpen]=useState(false),[active,setActive]=useState(0),[bounds,setBounds]=useState({});
  const trigger=useRef(null),popup=useRef(null),search=useRef({text:'',time:0});
  const listId=`${select.id}-options`;
  useLayoutEffect(()=>{
    const sync=()=>setState(previous=>{const next=snapshot(select);return JSON.stringify(previous)===JSON.stringify(next)?previous:next;});
    const observer=new MutationObserver(sync);observer.observe(select,{childList:true,subtree:true,attributes:true,characterData:true});
    const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    Object.defineProperty(select,'value',{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();}});
    select.addEventListener('change',sync);sync();
    return ()=>{observer.disconnect();select.removeEventListener('change',sync);delete select.value;};
  },[select]);
  useLayoutEffect(()=>{
    if(!open||state.disabled) {if(open)setOpen(false);return;}
    function position() {
      const rect=trigger.current.getBoundingClientRect();
      const below=innerHeight-rect.bottom-12,above=rect.top-12;
      const flip=below<180&&above>below,maxHeight=Math.min(300,flip?above:below);
      setBounds({left:Math.max(8,Math.min(rect.left,innerWidth-Math.max(rect.width,180)-8)),width:Math.min(Math.max(rect.width,180),innerWidth-16),maxHeight:Math.max(80,maxHeight),...(flip?{bottom:innerHeight-rect.top+5}:{top:rect.bottom+5})});
    }
    function outside(event) {if(!trigger.current?.contains(event.target)&&!popup.current?.contains(event.target))setOpen(false);}
    position();document.addEventListener('pointerdown',outside,true);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
    return ()=>{document.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);};
  },[open,state.disabled]);
  useLayoutEffect(()=>{if(open)popup.current?.querySelector('[data-active=true]')?.scrollIntoView({block:'nearest'});},[active,open]);
  function choose(index) {
    const option=state.options[index];if(!option||option.disabled)return;
    select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));setOpen(false);trigger.current.focus({preventScroll:true});
  }
  function show() {setActive(Math.max(0,state.options.findIndex(option=>option.value===state.value)));setOpen(true);}
  function keys(event) {
    event.stopPropagation();
    if(event.key==='Tab') {setOpen(false);return;}
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(['Enter',' '].includes(event.key)){event.preventDefault();if(open)choose(active);else show();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();if(!open){show();return;}
      const direction=event.key==='ArrowUp'?-1:1;
      let index=event.key==='Home'?0:event.key==='End'?state.options.length-1:active+direction;
      index=Math.max(0,Math.min(state.options.length-1,index));
      while(state.options[index]?.disabled&&index+direction>=0&&index+direction<state.options.length)index+=direction;
      setActive(index);return;
    }
    if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){
      const now=Date.now();search.current={text:(now-search.current.time<650?search.current.text:'')+event.key.toLocaleLowerCase(),time:now};
      const index=state.options.findIndex(option=>!option.disabled&&option.label.toLocaleLowerCase().startsWith(search.current.text));
      if(index>=0){if(!open)setOpen(true);setActive(index);}
    }
  }
  const selected=state.options.find(option=>option.value===state.value);
  return <><button ref={trigger} type="button" role="combobox" className={`custom-select-trigger ${select.classList.contains('group-tool')?'custom-group-select':''}`} aria-label={state.label} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={open?`${listId}-${active}`:undefined} disabled={state.disabled} data-native-select={select.id} onClick={()=>open?setOpen(false):show()} onKeyDown={keys}><span>{selected?.label||'Elegí…'}</span><span className="select-chevron" aria-hidden="true">⌄</span></button>
  {open&&createPortal(<div ref={popup} id={listId} role="listbox" aria-label={state.label} className="custom-select-menu" style={bounds}>{state.options.map((option,index)=><div key={`${option.value}:${index}`} id={`${listId}-${index}`} role="option" aria-selected={option.value===state.value} aria-disabled={option.disabled} data-active={index===active} className="custom-select-option" onPointerDown={event=>event.preventDefault()} onPointerMove={event=>{if(event.movementX||event.movementY)setActive(index);}} onClick={()=>choose(index)}><span>{option.label}</span>{option.value===state.value&&<span aria-hidden="true">✓</span>}</div>)}</div>,select.closest('[role=dialog]')||document.body)}</>;
}

// Retain existing form/controller contracts while every visible select uses the same React component.
export function installCustomSelects() {
  const mounted=new Map();let nextId=0;
  function scan() {
    for(const select of document.querySelectorAll('select')) {
      if(mounted.has(select))continue;
      select.id||=`select-control-${++nextId}`;
      const host=document.createElement('span');host.className='custom-select-host';select.after(host);
      select.classList.add('native-select');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
      const root=createRoot(host);mounted.set(select,{root,host});root.render(<CustomSelect select={select}/>);
    }
    for(const [select,{root,host}] of mounted)if(!select.isConnected){root.unmount();host.remove();mounted.delete(select);}
  }
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();
  return ()=>{observer.disconnect();for(const [select,{root,host}] of mounted){root.unmount();host.remove();select.classList.remove('native-select');select.removeAttribute('aria-hidden');select.removeAttribute('tabindex');}};
}
