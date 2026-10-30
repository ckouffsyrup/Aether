import {useRef, useState} from 'react';
import {useEvent} from '../shared';

export type ToastState={id:number;text:string}|null;

/** One toast at a time; a new message replaces the old one and restarts its timer. */
export function useToast(durationMs=3500){
 const [toast,setToast]=useState<ToastState>(null);
 const timer=useRef<number|undefined>(undefined);
 const message=useEvent((text:string)=>{
  clearTimeout(timer.current);setToast({id:Date.now(),text});
  timer.current=window.setTimeout(()=>setToast(null),durationMs);
 });
 const dismiss=useEvent(()=>setToast(null));
 return {toast,message,dismiss};
}
