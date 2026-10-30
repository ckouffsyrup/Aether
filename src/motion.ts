import {useEffect, useState} from 'react';
import type {MotionLevel} from './shared';

/** User's motion preference, forced to 'off' when Windows asks apps to reduce motion. */
export function useMotionLevel(preference:MotionLevel):MotionLevel{
 const query='(prefers-reduced-motion: reduce)';
 const [reduced,setReduced]=useState(()=>typeof matchMedia==='function'&&matchMedia(query).matches);
 useEffect(()=>{
  if(typeof matchMedia!=='function')return;
  const list=matchMedia(query);const update=()=>setReduced(list.matches);
  list.addEventListener('change',update);return()=>list.removeEventListener('change',update);
 },[]);
 return reduced?'off':preference;
}

export const exitDuration=(level:MotionLevel,full:number,subtle=Math.round(full*.75))=>level==='off'?0:level==='subtle'?subtle:full;

/** Keeps an element mounted long enough to play its exit animation.
 *  Returns null when unmounted, otherwise 'in' or 'out' for CSS. */
export function usePresence(open:boolean,exitMs:number):'in'|'out'|null{
 const [state,setState]=useState<'in'|'out'|null>(open?'in':null);
 useEffect(()=>{
  if(open){setState('in');return}
  setState(prev=>prev===null?null:'out');
  if(exitMs<=0){setState(null);return}
  const timer=window.setTimeout(()=>setState(null),exitMs);
  return()=>clearTimeout(timer);
 },[open,exitMs]);
 return state;
}

/** Keeps the last non-null value around while an exit animation plays. */
export function useLatest<T>(value:T|null):T|null{
 const [kept,setKept]=useState<T|null>(value);
 useEffect(()=>{if(value!==null)setKept(value)},[value]);
 return value??kept;
}
