import { readStorage, writeCookie } from './storage.mjs';
const historyKey='practica-historial';
const attemptKey='practica-intentos-v2';
const history=readStorage(historyKey);
history.recent ||= [];
history.totals ||= [0,0,0,0];
let attempts=[];
try { const saved=JSON.parse(localStorage.getItem(attemptKey)||'[]'); if(Array.isArray(saved)) attempts=saved.filter(a=>a&&Number.isFinite(a.time)&&typeof a.mode==='string'&&typeof a.correct==='boolean'&&Number.isFinite(a.credit)); } catch {}
let stats={};
let storageError=false;
let snapshot={stats,history,attempts,storageError};
const listeners=new Set();
export const subscribeDashboard=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
export const getDashboard=()=>snapshot;
export function refreshDashboard() {
  snapshot={stats:{...stats},history:{...history},attempts:[...attempts],storageError};
  listeners.forEach(listener=>listener());
}
export function initDashboard(results) {stats=results;refreshDashboard();}
export function recordAttempt(attempt) {
  attempts.push({...attempt,time:Date.now()});
  attempts=attempts.slice(-5000);
  try {localStorage.setItem(attemptKey,JSON.stringify(attempts));storageError=false;} catch {storageError=true;}
  refreshDashboard();
}
export function saveSessionResult({started,times},completed) {
  const seconds=times.map(ms=>Math.round(ms/1000));
  if(!seconds.some(Boolean)||history.recent.some(row=>row[0]===started)) return;
  history.recent.unshift([started,...seconds,Number(completed)]);
  history.recent.length=Math.min(history.recent.length,35);
  history.totals=history.totals.map((total,index)=>total+(index===0?1:seconds[index-1]));
  writeCookie(historyKey,history);
  refreshDashboard();
}
