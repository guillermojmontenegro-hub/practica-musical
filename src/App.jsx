import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Dashboard from './Dashboard.jsx';
import { initializeApp } from './app.mjs';
import { installCustomSelects } from './CustomSelect.jsx';

const expandedOnDesktop=()=>!window.matchMedia('(max-width: 900px)').matches;

function SoundSettings() {
  return (<details className="practice sound-settings settings-panel" open={false}>
  <summary><h2 id="sound-title">Sonido y tempo</h2></summary>
  <div className="practice-controls">
    <label>Instrumento <select id="instrument"></select></label>
    <label><input type="checkbox" id="random-instrument" /> Instrumento aleatorio</label>
    <label>Tempo <input id="tempo" type="number" min="40" max="220" defaultValue="90" /> BPM <small id="tempo-unit" hidden></small></label>
    <label><input type="checkbox" id="random-tempo" /> Tempo aleatorio</label>
  </div>
  <details>
    <summary>Metrónomo</summary>
    <div className="practice-controls">
      <label>Tempo <input id="metro-tempo" type="number" min="30" max="240" defaultValue="80" /> BPM <small id="metro-unit">negra</small></label>
      <label>Compás <select id="metro-meter" defaultValue="4/4"><option>2/4</option><option>3/4</option><option>4/4</option><option>6/8</option><option>9/8</option><option>12/8</option></select></label>
      <label><input type="checkbox" id="metro-subdivision" /> Subdividir</label>
      <button type="button" className="next" id="metro-toggle" aria-pressed="false">Iniciar metrónomo</button>
      <output id="metro-beat" aria-label="Pulso actual"></output>
    </div>
  </details>
</details>);
}

function GuidedPractice() {
  return (<details className="practice settings-panel guided-settings" open={false}>
  <summary><span className="practice-head"><h2 id="practice-title">Práctica guiada · Pomodoro</h2><output id="clock" aria-label="Tiempo restante" hidden></output></span></summary>
  <form id="practice-form" className="practice-controls">
    <label>Ejercicios de la app <input id="minutes" type="number" min="0" max="180" defaultValue="15" required /> min</label>
    <label>Ejercicios de la cátedra <input id="chair-minutes" type="number" min="0" max="180" defaultValue="10" required /> min</label>
    <label>Descanso <input id="rest-minutes" type="number" min="0" max="60" defaultValue="5" required /> min</label>
    <label>Rondas <input id="rounds" type="number" min="1" max="12" defaultValue="1" required /></label>
    <label>Recordatorio diario <input id="reminder" type="time" /></label>
    <button className="next" id="start">Empezar práctica</button>
    <button className="answer" type="button" id="pause-session" hidden>Pausar</button>
    <button className="skip" type="button" id="next-block" hidden>Saltar bloque</button>
    <button className="skip" type="button" id="finish" hidden>Terminar práctica</button>
  </form>
  <details id="pool"><summary>Elegir ejercicios de la práctica</summary><div id="practice-types"></div></details>
  <div id="session-phase" className="session-phase" hidden><strong id="phase-title"></strong><small id="phase-round"></small><p id="phase-description"></p></div>
  <p id="practice-status" role="status"></p>
</details>);
}

const SidebarControls=memo(function SidebarControls() {
  return <><div className="sidebar-section-label">EJERCICIOS</div><details className="exercise-menu" id="exercise-menu" open={expandedOnDesktop()}><summary><span>Elegir ejercicio</span><strong id="current-exercise">Escalas</strong></summary><h2 className="module-title">Ejercicios</h2>
<nav className="nav" aria-label="Temas">
</nav></details>

<div className="sidebar-section-label">CONFIGURACIÓN</div><SoundSettings /><GuidedPractice /></>;
});

function ExerciseWorkspace() {
  return (<div className="layout" id="exercise-layout">
<section className="card" aria-labelledby="title">
<div className="cardtop"><div><h2 id="title"></h2></div><span className="count" id="count"></span></div>
<div className="exercise-score" role="status"><span id="scoreLabel">Aciertos</span><strong id="score">0 / 0</strong></div>
<div className="listen" id="listen"><button className="play" id="play" aria-label="Reproducir audio" aria-pressed="false"><svg className="icon-play" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 4v16l13-8z"/></svg><svg className="icon-pause" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4h3.6v16H7zM13.4 4H17v16h-3.6z"/></svg></button><div><strong id="playLabel"></strong><small id="sound-playing"></small><small id="playStatus" role="status"></small></div><div className="bars" aria-hidden="true"></div></div>
<div className="staff-tools"><button type="button" className="answer" id="listen-melody" hidden>Escuchar melodía</button><span className="editor-help" id="listen-count" role="status"></span></div>
<div className="exercise-options" role="group" aria-label="Opciones del ejercicio">
  <div className="exercise-filters">
    <label className="mode" id="progression-count-label" hidden><span>Acordes</span><select id="progression-count" aria-label="Cantidad de acordes en la progresión" defaultValue="6">{[4,5,6,7,8].map(count=><option key={count} value={count}>{count}</option>)}</select></label>
    <label className="mode" id="progression-dominants-label" hidden><span>Dominantes</span><select id="progression-dominants" aria-label="Dominantes secundarias en la progresión" defaultValue="mixed"><option value="mixed">Indistinto</option><option value="none">Sin dominantes</option><option value="always">Con dominante</option></select></label>
    <label className="mode" id="key-practice-filter" hidden><span>Tonalidad</span><select id="key-practice" defaultValue="both"><option value="major">Mayor</option><option value="minor">Menor</option><option value="both">Ambas</option></select></label>
    <label className="mode" id="meter-filter" hidden><span>Compás</span><select id="meter-choice"><option value="mixed">Ambos</option><option value="simple">Simple</option><option value="compound">Compuesto</option></select></label>
    <label className="mode" id="dictation-bars-label" hidden><span>Compases</span><select id="dictation-bars" defaultValue="2"><option value="2">2</option><option value="4">4</option></select></label>
    <label className="mode" id="rhythm-pitches-label" hidden><span>Voces</span><select id="rhythm-pitches"><option value="1">Una voz</option><option value="2">Dos voces</option></select></label>
  </div>
  <div className="exercise-toggles">
    <label className="mode" id="arpeggioLabel" hidden><input id="arpeggio" type="checkbox" aria-label="Escuchar como arpegio" /><span>Arpegio</span></label>
    <label className="mode" id="progression-sevenths-label" hidden><input id="progression-sevenths" type="checkbox" aria-label="Incluir acordes con séptima" /><span>Con séptima</span></label>
    <label className="mode" id="progression-octave-label" hidden><input id="progression-octave" type="checkbox" /><span>En 1 octava</span></label>
  </div>
</div>
<div id="harmony-context" className="harmony-context" hidden>
  <dl>
    <div><dt>Tonalidad</dt><dd id="harmony-key"></dd></div>
    <div><dt>Escala</dt><dd id="harmony-scale"></dd></div>
    <div><dt>Acorde</dt><dd id="harmony-chord"></dd></div>
  </dl>
  <details><summary>Cómo resolverlo</summary><p>Buscá la nota que queda una quinta justa por debajo de la fundamental del acorde dado. Fijate qué grado ocupa esa nota en la escala de referencia. Por ejemplo, en Do mayor, Re7 (Re, Fa♯, La, Do) resuelve en Sol. Sol es el quinto grado, así que Re7 es V⁷/V. Fa♯ es la sensible de Sol.</p></details>
</div>
<p id="prompt" className="prompt"></p><p id="context" className="context" hidden></p>
<div id="editor" hidden></div>
<div id="notation" hidden></div>
<div className="answers" id="answers" role="group" aria-labelledby="prompt"></div>
<div className="feedback" id="feedback" role="status"></div>
<div id="answer-review"></div>
<div className="actions"><button className="skip" id="skip">Saltar ejercicio</button><button className="next" id="next" disabled>Comprobar →</button></div>

</section></div>);
}

const PracticeContent=memo(ExerciseWorkspace);
function initialTheme() {
  try { const saved=localStorage.getItem('practica-tema');if(['light','dark'].includes(saved)) return saved; } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light';
}
export default function App() {
  const [page,setPage]=useState('practice');
  const [theme,setTheme]=useState(initialTheme);
  const [compact,setCompact]=useState(()=>!expandedOnDesktop());
  const [sidebarOpen,setSidebarOpen]=useState(expandedOnDesktop);
  const sidebar=useRef(null);
  const toggle=useRef(null);
  useLayoutEffect(() => { queueMicrotask(initializeApp); }, []);
  useLayoutEffect(()=>installCustomSelects(),[]);
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    try {localStorage.setItem('practica-tema',theme);} catch {}
  },[theme]);
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 900px)');
    const change=event=>{setCompact(event.matches);setSidebarOpen(!event.matches);};
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  function closeMenu() {setSidebarOpen(false);requestAnimationFrame(()=>toggle.current?.focus());}
  useEffect(()=>{
    if(!sidebarOpen) return;
    const previousOverflow=document.body.style.overflow;
    if(compact) {document.body.style.overflow='hidden';sidebar.current.querySelector('.sidebar-close').focus();}
    function keys(event) {
      if(event.key==='Escape') {event.preventDefault();closeMenu();return;}
      if(!compact||event.key!=='Tab') return;
      const focusable=[...sidebar.current.querySelectorAll('a[href],button:not(:disabled),summary,input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last) {event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',keys);
    return ()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keys);};
  },[compact,sidebarOpen]);
  useEffect(()=>{
    const picked=()=>{
      setPage('practice');
      if(window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false);
      requestAnimationFrame(()=>{
        document.getElementById('practice-page').focus({preventScroll:true});
        window.scrollTo({top:0,behavior:'instant'});
      });
    };
    window.addEventListener('practica:exercise-picked',picked);
    return ()=>window.removeEventListener('practica:exercise-picked',picked);
  },[]);
  function navigate(next) {
    setPage(next);
    if(compact) setSidebarOpen(false);
    window.dispatchEvent(new CustomEvent('practica:navigate'));
    requestAnimationFrame(()=>{
      document.getElementById(`${next}-page`).focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
    });
  }
  function practice(mode) {
    navigate('practice');
    if(mode) window.dispatchEvent(new CustomEvent('practica:select',{detail:mode}));
  }
  return <>
    <header className="app-header" inert={compact&&sidebarOpen}><div className="head"><div className="header-start"><button ref={toggle} className="menu-toggle" aria-label={sidebarOpen?'Contraer menú lateral':'Abrir menú lateral'} aria-expanded={sidebarOpen} aria-controls="app-sidebar" onClick={()=>setSidebarOpen(!sidebarOpen)}><span aria-hidden="true">☰</span></button><div className="brand"><span className="mark" aria-hidden="true">♪</span> Practica</div></div><div className="header-tools"><span className="topline">Conservatorio</span><button className="theme-toggle" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={theme==='dark'?'Activar modo claro':'Activar modo oscuro'} aria-pressed={theme==='dark'}><span aria-hidden="true">{theme==='dark'?'☀':'☾'}</span><span>{theme==='dark'?'Modo claro':'Modo oscuro'}</span></button></div></div></header>
    <div className={`app-frame ${sidebarOpen?'sidebar-open':'sidebar-collapsed'}`}>
      {compact&&sidebarOpen&&<button className="sidebar-backdrop" tabIndex={-1} aria-label="Cerrar menú lateral" onClick={closeMenu}/>}
      <aside ref={sidebar} id="app-sidebar" className="app-sidebar" hidden={!sidebarOpen} role={compact?'dialog':undefined} aria-modal={compact&&sidebarOpen?true:undefined} aria-label="Menú lateral">
        <div className="sidebar-heading"><strong>Tu espacio musical</strong><button className="sidebar-close" aria-label="Cerrar menú lateral" onClick={closeMenu}>×</button></div>
        <nav className="sidebar-navigation" aria-label="Secciones">
          <button id="practice-tab" aria-current={page==='practice'?'page':undefined} aria-controls="practice-page" onClick={()=>navigate('practice')}><span aria-hidden="true">♪</span>Práctica</button>
          <button id="dashboard-tab" aria-current={page==='dashboard'?'page':undefined} aria-controls="dashboard-page" onClick={()=>navigate('dashboard')}><span aria-hidden="true">▥</span>Estadísticas</button>
        </nav>
        <SidebarControls />
        <p className="feedback" id="cookie-status" role="status" hidden>El navegador no permite guardar cookies para esta página. Para conservar tu progreso, abrí la app desde una dirección web con las cookies habilitadas.</p>
        <footer className="sidebar-footer"><a href="/sonidos.html" target="_blank" rel="noreferrer">Créditos de los sonidos</a></footer>
      </aside>
      <main className="workspace-main" inert={compact&&sidebarOpen}>
        <div id="practice-page" tabIndex={-1} aria-label="Ejercicio actual" hidden={page!=='practice'}><p id="workspace-session-status" className="workspace-session-status" role="status" hidden></p><PracticeContent /></div>
        <div id="dashboard-page" tabIndex={-1} aria-labelledby="dashboard-tab" hidden={page!=='dashboard'}><Dashboard onPractice={practice}/></div>
      </main>
    </div>
  </>;
}
