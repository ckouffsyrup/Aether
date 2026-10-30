import {convertFileSrc} from '@tauri-apps/api/core';
import {useEffect, useMemo, useRef, useState} from 'react';
import {isDesktop, targetKind, type Item} from '../shared';
import {errorText, joinPath, native} from '../lib/native';
import {LEGACY_ICON_CACHE_KEY} from '../lib/storage';

const ICON_BATCH=24;

/**
 * Windows icons for shortcuts without a custom icon. Rust keeps them as PNG
 * files in the app-data "icon-cache" folder (keyed by path + modified time),
 * so this hook only tracks target -> file name. On start it looks up what's
 * cached, prunes stale files, then extracts the rest in batches.
 */
export function useIconCache(items:Item[],opts:{settle:boolean;statsWanted:boolean;message:(t:string)=>void}){
 const [icons,setIcons]=useState<Record<string,string>>({});
 const [dir,setDir]=useState('');
 const [ready,setReady]=useState(false);
 const [epoch,setEpoch]=useState(0);
 const [caching,setCaching]=useState(false);
 const [stats,setStats]=useState<[number,number]|null>(null);
 const pending=useRef(new Set<string>());

 useEffect(()=>{try{localStorage.removeItem(LEGACY_ICON_CACHE_KEY)}catch{}},[]);

 const targetsKey=useMemo(()=>[...new Set(items.filter(x=>!x.icon&&!x.iconFile&&targetKind(x)!=='url'&&targetKind(x)!=='app-id').map(x=>x.target))].join('\n'),[items]);

 useEffect(()=>{
  if(!isDesktop())return;let cancelled=false;
  (async()=>{
   try{
    const folder=await native<string>('icon_cache_folder');if(cancelled)return;setDir(folder);
    const targets=targetsKey?targetsKey.split('\n'):[];
    const found=targets.length?await native<(string|null)[]>('icon_cache_lookup',{targets}):[];
    if(cancelled)return;
    const map:Record<string,string>={};targets.forEach((t,i)=>{const f=found[i];if(f)map[t]=f});
    setIcons(map);
    if(epoch===0)native('prune_icon_cache',{keep:Object.values(map)}).catch(()=>{});
   }catch{}finally{if(!cancelled)setReady(true)}
  })();
  return()=>{cancelled=true};
 },[epoch]);

 useEffect(()=>{
  if(!isDesktop()||!ready)return;let cancelled=false;
  const timer=window.setTimeout(async()=>{
   const queue=(targetsKey?targetsKey.split('\n'):[]).filter(t=>!icons[t]&&!pending.current.has(t));
   if(!queue.length)return;
   setCaching(true);
   try{
    for(let i=0;i<queue.length&&!cancelled;i+=ICON_BATCH){
     const batch=queue.slice(i,i+ICON_BATCH);batch.forEach(t=>pending.current.add(t));
     try{
      const result=await native<(string|null)[]>('extract_app_icons',{targets:batch});
      const found:Record<string,string>={};batch.forEach((t,j)=>{const v=result[j];if(v)found[t]=v});
      if(Object.keys(found).length)setIcons(prev=>({...prev,...found})); // applied even if a newer run started
     }catch{} // No icon available: the category glyph stays.
    }
   }finally{setCaching(false)}
  },opts.settle?300:1600);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[targetsKey,ready,epoch]);

 useEffect(()=>{if(opts.statsWanted&&isDesktop()&&!caching)native<[number,number]>('icon_cache_stats').then(setStats).catch(()=>{})},[opts.statsWanted,caching,epoch]);

 const clear=async()=>{
  try{if(isDesktop())await native('clear_icon_cache')}catch(e){return opts.message(errorText(e,'Could not clear the icon cache'))}
  pending.current.clear();setIcons({});setReady(false);setEpoch(n=>n+1);
  opts.message('Icon cache cleared. Icons are being rebuilt in the background.');
 };
 const iconSrcFor=(target:string)=>icons[target]&&dir?convertFileSrc(joinPath(dir,icons[target])):undefined;
 return {iconSrcFor,iconCount:Object.keys(icons).length,caching,stats,clear};
}
