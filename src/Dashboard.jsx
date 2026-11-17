import React, { useState, useSyncExternalStore, useRef, useLayoutEffect } from 'react';
import { getDashboard, subscribeDashboard } from './dashboard.mjs';
import { summarize } from './analytics.mjs';
import { modes } from './registry.mjs';
const percent=value=>value===null ? '—' : `${value} %`;
const duration=seconds=>seconds<60 ? `${seconds} s` : `${Math.round(seconds/60)} min`;
const date=new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short'});
const dateTime=new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'});
function Metric({label,value,detail}) {return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;}
function Evolution({daily}) {
  const [selected,setSelected]=useState(null);
  const chart=useRef(null);
  useLayoutEffect(()=>{if(chart.current?.clientWidth) chart.current.scrollLeft=chart.current.scrollWidth;},[daily]);
  const max=Math.max(1,...daily.map(day=>day.total));
  const active=daily.find(day=>day.date===selected);
  return <div className="evolution">
    <div className="chart-legend"><span><i className="legend-good"/>Correctos</span><span><i className="legend-bad"/>Fallidos</span></div>
    <div ref={chart} className="activity-chart" role="group" aria-label="Intentos diarios. Seleccioná un día para ver su detalle.">
      {daily.map(day=><button type="button" key={day.date} className={`day-bar ${selected===day.date?'selected':''}`} onClick={()=>setSelected(day.date)} aria-pressed={selected===day.date} aria-label={`${day.date}: ${day.total} intentos, ${day.right} correctos, ${day.total-day.right} fallidos`} title={`${day.date}: ${day.total} intentos`}>
        <span className="bar-stack" style={{height:day.total ? `${Math.max(4,day.total/max*100)}%`:'3px'}}>
          {day.total ? <><span className="bar-bad" style={{flex:day.total-day.right}}/><span className="bar-good" style={{flex:day.right}}/></> : <span className="bar-empty"/>}
        </span>
      </button>)}
    </div>
    <div className="chart-dates"><span>{daily[0]?.date}</span><span>{daily.at(-1)?.date}</span></div>
    <p className="chart-detail" role="status">{active ? `${date.format(new Date(`${active.date}T12:00:00`))}: ${active.total} intentos · ${active.right} correctos · ${active.total-active.right} fallidos` : 'Seleccioná una barra para consultar ese día. Podés deslizar el gráfico para ver más fechas.'}</p>
    {!daily.some(day=>day.total)&&<p className="empty-state">Tu evolución aparece cuando resolvés ejercicios. Cada respuesta suma.</p>}
  </div>;
}
export default function Dashboard({onPractice}) {
  const {stats,history,attempts,storageError}=useSyncExternalStore(subscribeDashboard,getDashboard);
  const [days,setDays]=useState('all');
  const [mode,setMode]=useState('all');
  const data=summarize(attempts,stats,{days,mode});
  const sessions=history.recent.filter(row=>days==='all'||row[0]>=(()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-Number(days)+1);return d.getTime();})());
  const totals=days==='all' ? history.totals : sessions.reduce((sum,row)=>[sum[0]+1,sum[1]+row[1],sum[2]+row[2],sum[3]+row[3]],[0,0,0,0]);
  return <div className="dashboard-content">
    <div className="dashboard-heading"><div><p className="eyebrow">TU RECORRIDO MUSICAL</p><h1>Estadísticas</h1><p className="muted">Reconocé tus avances y descubrí qué practicar después.</p></div><button className="next" onClick={()=>onPractice()}>Seguir practicando →</button></div>
    <div className="dashboard-filters"><label>Período <select value={days} onChange={event=>setDays(event.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="all">Todo el historial</option></select></label><label>Ejercicio <select value={mode} onChange={event=>setMode(event.target.value)}><option value="all">Todos los ejercicios</option>{Object.entries(modes).map(([id,item])=><option key={id} value={id}>{item.title}</option>)}</select></label><span className="local-badge">Guardado en este navegador</span></div>
    {storageError&&<p role="alert" className="feedback">No se pudo guardar el detalle de los últimos intentos. Los datos de esta sesión siguen disponibles mientras la página esté abierta.</p>}
    <div className="stats-grid">
      <Metric label="Ejercicios resueltos" value={data.total} detail={`${data.right} correctos · ${data.wrong} fallidos`}/>
      <Metric label="Aciertos" value={percent(data.accuracy)} detail={data.change===null ? 'La comparación semanal aparece con datos de ambas semanas' : `${data.change>0?'+':''}${data.change} puntos frente a la semana anterior`}/>
      <Metric label="Días con actividad" value={data.activeDays} detail="Según los intentos con fecha registrados"/>
    </div>
    <p className="data-note">Los totales anteriores se conservan. La evolución y el detalle de fallos se registran desde esta actualización (hasta 5.000 intentos). Solfeo leído y cantado usan tu autoevaluación.</p>
    <div className="dashboard-columns">
      <section className="dashboard-panel"><div className="panel-heading"><h2>Evolución de la práctica</h2><span>{days==='all'?'Últimos 30 días':`Últimos ${days} días`}</span></div><Evolution daily={data.daily}/></section>
      <section className="dashboard-panel"><h2>Fallos más comunes</h2><p className="muted small">Cantidad de ejercicios en los que apareció cada fallo. Un ejercicio puede tener varios.</p>
        {data.errors.length ? <ol className="error-ranking">{data.errors.map((error,index)=><li key={`${error.mode}:${error.label}`}><span className="rank">{index+1}</span><div><strong>{error.label}</strong><small>{modes[error.mode]?.title}</small><div className="error-track"><span style={{width:`${error.count/data.errors[0].count*100}%`}}/></div></div><span className="error-count">{error.count}</span><button className="text-button" aria-label={`Practicar ${modes[error.mode]?.title}`} onClick={()=>onPractice(error.mode)}>Practicar</button></li>)}</ol> : <p className="empty-state">Todavía no hay fallos registrados para este filtro. Cuando aparezcan, vas a poder practicar esos ejercicios desde acá.</p>}
      </section>
    </div>
    <section className="dashboard-panel"><div className="panel-heading"><h2>Resultados por ejercicio</h2><span>Elegí qué querés reforzar</span></div>
      <div className="exercise-results">{Object.entries(modes).filter(([id])=>mode==='all'||mode===id).map(([id,item])=>{
        const row=data.byMode[id] || {total:0,right:0,wrong:0,accuracy:null};
        return <article className="exercise-result" key={id}><div className="exercise-result-title"><span className="exercise-icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><strong>{percent(row.accuracy)}</strong></div><div className="result-track" role="meter" aria-label={`Aciertos en ${item.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.accuracy??0} aria-valuetext={row.total?percent(row.accuracy):'Sin intentos'}><span style={{width:`${row.accuracy??0}%`}}/></div><p>{row.total} intentos · <span className="good-text">{row.right} correctos</span> · {row.wrong} fallidos</p><button className="text-button" onClick={()=>onPractice(id)}>Practicar →</button></article>;
      })}</div>
    </section>
    <div className="dashboard-columns">
      <section className="dashboard-panel"><h2>Últimos intentos</h2>{data.filtered.length ? <ul className="attempt-list">{data.filtered.slice(-10).reverse().map((item,index)=><li key={`${item.time}:${index}`}><span className={`result-dot ${item.correct?'success':'failure'}`} aria-hidden="true"/><div><strong>{modes[item.mode]?.title || item.mode}</strong><small>{dateTime.format(item.time)}{item.selfAssessed?' · Autoevaluación':''}</small>{item.errors?.length>0&&<p>{item.errors.join(' · ')}</p>}</div><span>{item.correct?'Correcto':'A practicar'}</span></li>)}</ul> : <p className="empty-state">Resolvé un ejercicio para ver tu primer registro detallado.</p>}</section>
      <section className="dashboard-panel"><h2>Tiempo de práctica guiada</h2><p className="muted small">Sesiones de todos los ejercicios, según el período elegido.</p><div className="session-metrics"><Metric label="Sesiones" value={totals[0]}/><Metric label="En la app" value={duration(totals[1])}/><Metric label="Cátedra" value={duration(totals[2])}/><Metric label="Descansos" value={duration(totals[3])}/></div>
        {sessions.length ? <div className="tracking-table"><table><caption>Sesiones recientes</caption><thead><tr><th scope="col">Fecha</th><th scope="col">App</th><th scope="col">Estado</th></tr></thead><tbody>{sessions.slice(0,10).map(([started,app,chair,rest,completed])=><tr key={started}><th scope="row">{dateTime.format(started)}</th><td>{duration(app)}</td><td>{completed?'Completa':'Parcial'}</td></tr>)}</tbody></table></div> : <p className="empty-state">Las sesiones aparecen al terminar una práctica guiada.</p>}
      </section>
    </div>
  </div>;
}
