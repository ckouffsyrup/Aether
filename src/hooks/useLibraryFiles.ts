import {convertFileSrc} from '@tauri-apps/api/core';
import {useEffect, useRef, useState} from 'react';
import {isDesktop, type Item} from '../shared';
import {joinPath, native} from '../lib/native';
import type {Database} from '../lib/storage';

/**
 * Card art and custom icons live as files in the app-data "card-art" folder
 * (custom icons are named icon-<id>-<time>). This hook resolves them to
 * asset URLs, saves new ones, and migrates older inline (data URL) images to
 * files: an item only switches to its file after the write succeeds.
 */
export function useLibraryFiles(db:Database,setDb:React.Dispatch<React.SetStateAction<Database>>,message:(t:string)=>void){
 const [artDir,setArtDir]=useState('');
 useEffect(()=>{if(isDesktop())native<string>('card_art_folder').then(setArtDir).catch(()=>{})},[]);

 const fileSrc=(file:string)=>artDir?convertFileSrc(joinPath(artDir,file)):'';
 const artSrcFor=(item:Item)=>item.cardArt&&artDir?fileSrc(item.cardArt):item.cardImage;
 const customIconSrc=(item:Item)=>item.iconFile&&artDir?fileSrc(item.iconFile):item.icon;
 const deleteFile=(file?:string)=>{if(file&&isDesktop())native('delete_card_art',{file}).catch(()=>{})};

 const storeArt=async(id:string,data:string):Promise<{cardArt?:string;cardImage?:string}>=>{
  if(artDir){try{return {cardArt:await native<string>('save_card_art',{id,data})}}catch{message('Could not save card art to disk; kept it in the library instead.')}}
  return {cardImage:data};
 };
 const storeIcon=async(id:string,data:string):Promise<{iconFile?:string;icon?:string}>=>{
  if(artDir){try{return {iconFile:await native<string>('save_card_art',{id:'icon-'+id,data})}}catch{message('Could not save the icon to disk; kept it in the library instead.')}}
  return {icon:data};
 };

 const migrating=useRef(false);const failed=useRef(new Set<string>());const pruned=useRef(false);
 useEffect(()=>{
  if(!artDir||migrating.current)return;
  const jobs:{id:string;kind:'art'|'icon';data:string}[]=[];
  for(const x of db.items){
   if(x.cardImage?.startsWith('data:image/')&&!x.cardArt&&!failed.current.has('art:'+x.id))jobs.push({id:x.id,kind:'art',data:x.cardImage});
   if(x.icon?.startsWith('data:image/')&&!x.iconFile&&!failed.current.has('icon:'+x.id))jobs.push({id:x.id,kind:'icon',data:x.icon});
  }
  if(!jobs.length){
   // Once per session: delete files no shortcut references any more.
   if(!pruned.current){pruned.current=true;native('prune_card_art',{keep:db.items.flatMap(x=>[x.cardArt,x.iconFile].filter((f):f is string=>!!f))}).catch(()=>{})}
   return;
  }
  migrating.current=true;
  (async()=>{
   const done:{id:string;kind:'art'|'icon';data:string;file:string}[]=[];
   for(const job of jobs){
    try{done.push({...job,file:await native<string>('save_card_art',{id:job.kind==='icon'?'icon-'+job.id:job.id,data:job.data})})}
    catch{failed.current.add(job.kind+':'+job.id)}
   }
   if(done.length)setDb(old=>({...old,items:old.items.map(x=>{
    let next=x;
    for(const d of done){if(d.id!==x.id)continue;
     if(d.kind==='art'&&next.cardImage===d.data&&!next.cardArt)next={...next,cardArt:d.file,cardImage:undefined};
     if(d.kind==='icon'&&next.icon===d.data&&!next.iconFile)next={...next,iconFile:d.file,icon:undefined};
    }
    return next;
   })}));
  })().finally(()=>{migrating.current=false});
 },[artDir,db.items]);

 /** After importing a backup, retry items whose migration failed earlier. */
 const resetMigrationFailures=()=>failed.current.clear();
 return {artDir,fileSrc,artSrcFor,customIconSrc,deleteFile,storeArt,storeIcon,resetMigrationFailures};
}
