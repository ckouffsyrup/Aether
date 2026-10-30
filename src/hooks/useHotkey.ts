import {useEffect, useState} from 'react';
import {isDesktop, useEvent} from '../shared';
import {errorText, native} from '../lib/native';
import {DEFAULT_HOTKEY, hotkeyLabel} from '../lib/hotkeys';

export type HotkeyStatus={shortcut:string;active:boolean;error:string|null};
const WARNED_KEY='veyl.aether.hotkeyWarned';

/**
 * v0.15.2 global hotkey: the combination Rust registered at startup, whether
 * Windows gave it to Aether, and changing it. Rust keeps the combination in
 * the app-data folder so it works at sign-in before this UI exists.
 */
export function useHotkey({ready,message}:{ready:boolean;message:(text:string)=>void}){
 const [status,setStatus]=useState<HotkeyStatus>({shortcut:DEFAULT_HOTKEY,active:isDesktop(),error:null});
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  if(!ready||!isDesktop())return;
  let cancelled=false,waiting=false;
  const warn=(s:HotkeyStatus)=>{
   // Started hidden in the tray: wait until the window is on screen so the toast isn't missed.
   if(document.visibilityState!=='visible'){waiting=true;return}
   waiting=false;
   // Say it once per combination, not on every launch.
   let warned:string|null=null;
   try{warned=localStorage.getItem(WARNED_KEY)}catch{}
   if(warned===s.shortcut)return;
   try{localStorage.setItem(WARNED_KEY,s.shortcut)}catch{}
   message(`${hotkeyLabel(s.shortcut)} is taken by another app. Pick a different hotkey in Settings → Desktop.`);
  };
  let latest:HotkeyStatus|null=null;
  const onVisible=()=>{if(waiting&&latest&&!latest.active)warn(latest)};
  document.addEventListener('visibilitychange',onVisible);
  native<HotkeyStatus>('hotkey_status').then(s=>{
   if(cancelled||!s)return;
   latest=s;setStatus(s);
   if(!s.active)warn(s);
  }).catch(()=>{});
  return()=>{cancelled=true;document.removeEventListener('visibilitychange',onVisible)};
 },[ready]);

 /** Resolves to an error message, or null when the new combination is active. */
 const change=useEvent(async(accelerator:string):Promise<string|null>=>{
  if(!isDesktop())return 'The hotkey works in the desktop app.';
  setBusy(true);
  try{
   const next=await native<HotkeyStatus>('set_hotkey',{shortcut:accelerator});
   setStatus(next);
   return null;
  }catch(e){
   const reason=errorText(e,'Windows refused that shortcut.');
   // A failed retry of the saved combination updates its reason; a failed new one keeps the old.
   native<HotkeyStatus>('hotkey_status').then(setStatus).catch(()=>{});
   return reason;
  }finally{setBusy(false)}
 });

 return {status,busy,change,retry:()=>change(status.shortcut),reset:()=>change(DEFAULT_HOTKEY)};
}
export type Hotkey=ReturnType<typeof useHotkey>;
