import { $ } from './dom.mjs';
export function answerFields(container,fields) {
  const draft=container.answerDraft||{};
  const row=document.createElement('div');row.className='answer-selectors';
  for(const {key,label,options,section} of fields) {
    const wrapper=document.createElement('label');if(section)wrapper.dataset.section=section;wrapper.append(label);
    const input=document.createElement('select');input.setAttribute('aria-label',label);input.add(new Option('Elegí…',''));
    input.dataset.answerKey=key;
    options.forEach(([value,text])=>input.add(new Option(text,value)));input.value=draft[key]||'';
    input.addEventListener('change',()=>{draft[key]=input.value;update();container.saveAnswerDraft?.();});wrapper.append(input);row.append(wrapper);
  }
  function update() {$('next').disabled=fields.some(field=>!draft[field.key]);}
  container.append(row);update();return draft;
}
