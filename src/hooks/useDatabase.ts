import {useEffect, useRef, useState} from 'react';
import {useEvent, type Preferences} from '../shared';
import {readDatabase, writeDatabase, type Database} from '../lib/storage';

/**
 * The library and settings. Saves are debounced (400 ms after the last change)
 * and flushed when the window hides or closes, or on request (flush). dbRef always holds the latest
 * committed value for event handlers.
 */
export function useDatabase(onQuotaFull:()=>void){
 const [db,setDb]=useState<Database>(readDatabase);
 const dbRef=useRef(db);
 const saveTimer=useRef<number|undefined>(undefined);
 const warned=useRef(false);

 useEffect(()=>{
  dbRef.current=db;clearTimeout(saveTimer.current);
  saveTimer.current=window.setTimeout(()=>{if(!writeDatabase(db)&&!warned.current){warned.current=true;onQuotaFull()}},400);
 },[db]);
 /** Write now instead of waiting for the debounce (before the updater closes Aether). */
 const flush=useEvent(()=>{clearTimeout(saveTimer.current);writeDatabase(dbRef.current)});
 useEffect(()=>{
  const onVisibility=()=>{if(document.visibilityState==='hidden')flush()};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',onVisibility);
  return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onVisibility)};
 },[]);

 const setPref=<K extends keyof Preferences>(key:K,value:Preferences[K])=>setDb(old=>({...old,preferences:{...old.preferences,[key]:value}}));
 const setPrefs=(patch:Partial<Preferences>)=>setDb(old=>({...old,preferences:{...old.preferences,...patch}}));
 return {db,setDb,dbRef,setPref,setPrefs,flush};
}
