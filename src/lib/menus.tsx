import {Copy, Edit3, ExternalLink, FileImage, FolderOpen, Image as ImageIcon, Layers3, RotateCcw, ShieldCheck, Star, StarOff, Trash2} from 'lucide-react';
import type {MenuEntry} from '../ContextMenu';
import {categories, isDesktop, targetKind, type Category, type Item} from '../shared';

/** Everything the right-click menus can do; supplied by App. */
export type MenuActions={
 run:(item:Item,verb?:'open'|'runas')=>void;
 reveal:(item:Item)=>void;
 copyTarget:(item:Item)=>void;
 toggleFavorite:(id:string)=>void;
 setFavorites:(ids:string[],value:boolean)=>void;
 edit:(item:Item)=>void;
 quickPick:(id:string,field:'icon'|'art')=>void;
 resetIcon:(item:Item)=>void;
 moveTo:(ids:string[],category:Category)=>void;
 resetStats:(ids:string[])=>void;
 remove:(item:Item)=>void;
 removeMany:(ids:string[])=>void;
};

const categoryMenu=(a:MenuActions,ids:string[],current?:Category):MenuEntry=>({kind:'sub',id:'move',label:'Move to category',icon:<Layers3 size={15}/>,
 children:categories.map(c=>({kind:'item',id:'cat-'+c,label:c,checked:current===c,disabled:current===c,onSelect:()=>a.moveTo(ids,c)}))});

/** Menu for a single shortcut. Entries adapt to what the target is. */
export function itemMenu(a:MenuActions,item:Item):MenuEntry[]{
 const k=targetKind(item);
 const entries:MenuEntry[]=[{kind:'item',id:'open',label:'Open',icon:<ExternalLink size={15}/>,hint:'Enter',onSelect:()=>a.run(item)}];
 if(isDesktop()&&k==='program')entries.push({kind:'item',id:'admin',label:'Run as administrator',icon:<ShieldCheck size={15}/>,onSelect:()=>a.run(item,'runas')});
 if(k!=='url'&&k!=='app-id')entries.push({kind:'item',id:'reveal',label:'Open file location',icon:<FolderOpen size={15}/>,disabled:!isDesktop(),onSelect:()=>a.reveal(item)});
 entries.push(
  {kind:'sep'},
  {kind:'item',id:'copy',label:k==='url'?'Copy link':k==='app-id'?'Copy app ID':'Copy path',icon:<Copy size={15}/>,onSelect:()=>a.copyTarget(item)},
  {kind:'sep'},
  {kind:'item',id:'fav',label:item.favorite?'Remove from favorites':'Add to favorites',icon:item.favorite?<StarOff size={15}/>:<Star size={15}/>,onSelect:()=>a.toggleFavorite(item.id)},
  {kind:'item',id:'edit',label:'Edit…',icon:<Edit3 size={15}/>,onSelect:()=>a.edit(item)},
  {kind:'item',id:'icon',label:'Change icon…',icon:<ImageIcon size={15}/>,onSelect:()=>a.quickPick(item.id,'icon')},
  ...((item.icon||item.iconFile)?[{kind:'item' as const,id:'auto-icon',label:'Use automatic icon',icon:<RotateCcw size={15}/>,onSelect:()=>a.resetIcon(item)}]:[]),
  {kind:'item',id:'art',label:'Change card art…',icon:<FileImage size={15}/>,onSelect:()=>a.quickPick(item.id,'art')},
  categoryMenu(a,[item.id],item.category),
  {kind:'item',id:'reset',label:'Reset launch stats',icon:<RotateCcw size={15}/>,disabled:!item.launchCount&&!item.lastOpened,onSelect:()=>a.resetStats([item.id])},
  {kind:'sep'},
  {kind:'item',id:'remove',label:'Remove from Aether',icon:<Trash2 size={15}/>,danger:true,onSelect:()=>a.remove(item)},
 );
 return entries;
}

/** Menu for a bulk-mode selection. */
export function selectionMenu(a:MenuActions,ids:string[],items:Item[]):MenuEntry[]{
 const chosen=items.filter(x=>ids.includes(x.id));
 return [
  {kind:'header',label:`${ids.length} selected`},
  {kind:'item',id:'fav',label:'Add to favorites',icon:<Star size={15}/>,disabled:chosen.every(x=>x.favorite),onSelect:()=>a.setFavorites(ids,true)},
  {kind:'item',id:'unfav',label:'Remove from favorites',icon:<StarOff size={15}/>,disabled:!chosen.some(x=>x.favorite),onSelect:()=>a.setFavorites(ids,false)},
  categoryMenu(a,ids),
  {kind:'item',id:'reset',label:'Reset launch stats',icon:<RotateCcw size={15}/>,disabled:!chosen.some(x=>x.launchCount||x.lastOpened),onSelect:()=>a.resetStats(ids)},
  {kind:'sep'},
  {kind:'item',id:'remove',label:'Remove from Aether',icon:<Trash2 size={15}/>,danger:true,onSelect:()=>a.removeMany(ids)},
 ];
}

/** Run `before` ahead of every action (e.g. close the quick launcher). */
export const wrapEntries=(entries:MenuEntry[],before:()=>void):MenuEntry[]=>entries.map(e=>e.kind==='item'?{...e,onSelect:()=>{before();e.onSelect()}}:e.kind==='sub'?{...e,children:wrapEntries(e.children,before)}:e);
