import {useEffect, useRef, useState} from 'react';
import type {Update} from '@tauri-apps/plugin-updater';
import {APP_VERSION, isDesktop, useEvent} from '../shared';
import {errorText, native} from '../lib/native';
import {compareVersions} from '../lib/updates';

export type UpdateStatus=
 |{kind:'unsupported';reason:'browser'|'unconfigured'}
 |{kind:'idle'}
 |{kind:'checking'}
 |{kind:'current'}
 |{kind:'available';version:string;notes:string}
 |{kind:'downloading';version:string;notes:string;progress:number|null}
 |{kind:'installing';version:string;notes:string}
 |{kind:'error';message:string;version?:string;notes?:string};

/** The update notice shows for these (an error only once an update was found). */
export const noticeVersion=(s:UpdateStatus)=>s.kind==='available'||s.kind==='downloading'||s.kind==='installing'||s.kind==='error'?s.version:undefined;

const FIRST_CHECK_DELAY=6000;
const CHECK_EVERY=6*60*60*1000;
const LAST_VERSION_KEY='veyl.aether.lastVersion';

/**
 * v0.15 updates: checks GitHub Releases (signed latest.json) at launch and every
 * six hours when automatic checks are on. Nothing installs until the user picks
 * Restart; then the update downloads, saves are flushed, and the Windows
 * installer closes Aether, installs quietly and reopens it.
 */
export function useUpdater({ready,auto,flushSave,message}:{ready:boolean;auto:boolean;flushSave:()=>void;message:(text:string)=>void}){
 const [status,setStatus]=useState<UpdateStatus>(()=>isDesktop()?{kind:'idle'}:{kind:'unsupported',reason:'browser'});
 const [lastChecked,setLastChecked]=useState<number|null>(null);
 const [hiddenFor,setHiddenFor]=useState<string|null>(null);
 const update=useRef<Update|null>(null);
 const busy=useRef(false);
 const configured=useRef<boolean|null>(null);

 const isConfigured=async()=>{
  if(configured.current===null){
   configured.current=await native<boolean>('updates_configured').catch(()=>false);
   if(!configured.current)setStatus({kind:'unsupported',reason:'unconfigured'});
  }
  return configured.current;
 };

 const check=useEvent(async(manual:boolean)=>{
  if(!isDesktop()||busy.current||!await isConfigured())return;
  busy.current=true;
  if(manual)setStatus({kind:'checking'});
  try{
   const {check:checkForUpdate}=await import('@tauri-apps/plugin-updater');
   const found=await checkForUpdate({timeout:20000});
   setLastChecked(Date.now());
   const previous=update.current;update.current=found;
   if(previous&&previous!==found)previous.close().catch(()=>{});
   if(found)setStatus({kind:'available',version:found.version,notes:found.body??''});
   else{setStatus({kind:'current'});if(manual)message(`You're on the latest version (v${APP_VERSION})`)}
  }catch(e){
   // Automatic checks fail quietly (offline, GitHub down); manual ones say why.
   if(manual)setStatus({kind:'error',message:errorText(e,'Could not check for updates')});
  }finally{busy.current=false}
 });

 const install=useEvent(async()=>{
  const u=update.current;if(!u||busy.current)return;
  if(import.meta.env.DEV){message('Updates install into the installed app. In development, pull the new code instead.');return}
  busy.current=true;
  const version=u.version,notes=u.body??'';
  let total=0,received=0,shown=-1;
  setHiddenFor(null);setStatus({kind:'downloading',version,notes,progress:null});
  try{
   await u.download(event=>{
    if(event.event==='Started')total=event.data.contentLength??0;
    else if(event.event==='Progress'&&total){
     received+=event.data.chunkLength;
     const pct=Math.min(100,Math.floor(received/total*100));
     if(pct!==shown){shown=pct;setStatus({kind:'downloading',version,notes,progress:pct/100})}
    }
   });
   setStatus({kind:'installing',version,notes});
   flushSave();
   await native('prepare_update_restart').catch(()=>{});
   // Give WebView2 a moment to commit storage; the installer closes Aether right away.
   await new Promise(resolve=>setTimeout(resolve,900));
   await u.install();
  }catch(e){
   setStatus({kind:'error',message:errorText(e,'The update could not be installed'),version,notes});
  }finally{busy.current=false}
 });

 // "Aether updated to vX" once after an update.
 useEffect(()=>{
  if(!ready)return;
  let last:string|null=null;
  try{last=localStorage.getItem(LAST_VERSION_KEY);localStorage.setItem(LAST_VERSION_KEY,APP_VERSION)}catch{}
  if(last&&compareVersions(APP_VERSION,last)>0)message(`Aether updated to v${APP_VERSION}`);
 },[ready]);

 useEffect(()=>{
  if(!ready||!auto||!isDesktop())return;
  const first=window.setTimeout(()=>void check(false),FIRST_CHECK_DELAY);
  const every=window.setInterval(()=>void check(false),CHECK_EVERY);
  return()=>{clearTimeout(first);clearInterval(every)};
 },[ready,auto]);

 useEffect(()=>()=>{update.current?.close().catch(()=>{})},[]);

 const version=noticeVersion(status);
 return {
  status,lastChecked,
  check:()=>void check(true),
  install:()=>void install(),
  /** "Later" hides the notice for this version until Aether restarts; Settings still offers it. */
  later:()=>setHiddenFor(version??null),
  noticeVisible:!!version&&hiddenFor!==version,
 };
}
export type Updater=ReturnType<typeof useUpdater>;
