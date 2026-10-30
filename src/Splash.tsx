import {useEffect, useRef, useState} from 'react';

/**
 * Full-motion startup: the Aether mark draws itself, fills with an accent glow,
 * then dissolves into the interface. Any key, click, or scroll skips ahead.
 *   0-620ms   stroke draws          520-850ms  fill + glow
 *   600-900ms wordmark fades in     950ms      dissolve starts, UI arrives
 */
const DISSOLVE_AT=950, DISSOLVE_MS=320, SKIP_MS=170;

export function Splash({onArrive,onDone,skipSignal}:{onArrive:()=>void;onDone:()=>void;skipSignal:number}){
 const [phase,setPhase]=useState<'draw'|'dissolve'>('draw');
 const [fast,setFast]=useState(false);
 const ended=useRef(false);
 const arrive=useRef(onArrive);arrive.current=onArrive;
 const done=useRef(onDone);done.current=onDone;

 const dissolve=(skipped:boolean)=>{
  if(ended.current)return;ended.current=true;
  setFast(skipped);setPhase('dissolve');arrive.current();
  window.setTimeout(()=>done.current(),skipped?SKIP_MS:DISSOLVE_MS);
 };

 useEffect(()=>{
  const timer=window.setTimeout(()=>dissolve(false),DISSOLVE_AT);
  const skip=()=>dissolve(true);
  window.addEventListener('keydown',skip,{once:true});
  window.addEventListener('pointerdown',skip,{once:true});
  window.addEventListener('wheel',skip,{once:true,passive:true});
  return()=>{clearTimeout(timer);window.removeEventListener('keydown',skip);window.removeEventListener('pointerdown',skip);window.removeEventListener('wheel',skip)};
 },[]);
 // External skip (e.g. the global quick-launch hotkey fired during startup).
 useEffect(()=>{if(skipSignal)dissolve(true)},[skipSignal]);

 return <div className={'splash phase-'+phase+(fast?' is-fast':'')} aria-hidden="true">
  <div className="splash-glow"/>
  <div className="splash-mark">
   {/* Prism mark (v0.12.1): edges draw in, then each face fills, then the "A" counter opens. */}
   <svg viewBox="0 0 120 120" width="128" height="128">
    <polygon className="splash-face face-left" points="60,14 60,70 12,98" fill="#e3caff"/>
    <polygon className="splash-face face-right" points="60,14 108,98 60,70" style={{fill:'var(--accent)'}}/>
    <polygon className="splash-face face-base" points="12,98 60,70 108,98" style={{fill:'var(--accent)'}}/>
    <polygon className="splash-face face-counter" points="60,40 69,58 51,58" fill="#0b0b12"/>
    <path className="splash-stroke" d="M60 14 L108 98 L12 98 Z" pathLength={1}/>
    <path className="splash-bar" d="M60 14 L60 70 M12 98 L60 70 L108 98" pathLength={1}/>
   </svg>
   <div className="splash-word"><strong>AETHER</strong><span>VEYL STUDIOS</span></div>
  </div>
 </div>;
}
