import {useEffect, useRef, useState} from 'react';
import {isDesktop, type Preferences} from '../shared';
import {errorText, native} from '../lib/native';

/**
 * Wallpaper image. Desktop: copied into app data by Rust and loaded as raw
 * bytes. Browser preview: session-only object URL. prefs.wallpaper is
 * 'local' | 'preview' | '' (or a legacy https URL).
 */
export function useWallpaper(wallpaper:string,setPref:<K extends keyof Preferences>(k:K,v:Preferences[K])=>void,message:(t:string)=>void){
 const [preview,setPreview]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 const replace=(url:string)=>setPreview(old=>{if(old.startsWith('blob:'))URL.revokeObjectURL(old);return url});

 useEffect(()=>{
  if(!isDesktop()||wallpaper!=='local')return;let cancelled=false;let objectUrl='';
  native<ArrayBuffer>('load_wallpaper').then(bytes=>{if(cancelled||!bytes?.byteLength)return;objectUrl=URL.createObjectURL(new Blob([bytes]));setPreview(objectUrl)}).catch(()=>{});
  return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[wallpaper]);

 const select=async()=>{
  try{
   if(!isDesktop()){inputRef.current?.click();return}
   const {open}=await import('@tauri-apps/plugin-dialog');
   const selected=await open({multiple:false,directory:false,filters:[{name:'Images',extensions:['png','jpg','jpeg','webp','gif','bmp']}]});
   if(typeof selected!=='string')return;
   await native('set_wallpaper',{source:selected});
   const bytes=await native<ArrayBuffer>('load_wallpaper');
   replace(URL.createObjectURL(new Blob([bytes])));setPref('wallpaper','local');message('Background saved to Aether.');
  }catch(e){message(errorText(e,'Could not load image'))}
 };
 const fromBrowserFile=(file?:File)=>{
  if(!file)return;
  if(!file.type.startsWith('image/')||file.size>12*1024*1024)return message('Choose an image under 12 MB.');
  replace(URL.createObjectURL(file));setPref('wallpaper','preview');message('Background preview loaded. Desktop build saves backgrounds permanently.');
 };
 const clear=async()=>{
  if(isDesktop()){try{await native('clear_wallpaper')}catch(e){return message(errorText(e))}}
  replace('');setPref('wallpaper','');message('Background removed');
 };
 const cssImage=preview?`url("${preview}")`:wallpaper.startsWith('https://')?`url("${wallpaper}")`:'none';
 return {preview,cssImage,select,clear,fromBrowserFile,inputRef};
}
