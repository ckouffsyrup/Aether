import React from 'react';
import {AlertTriangle, Info, Search, X} from 'lucide-react';
import {categoryIcon, type Item, type MotionLevel} from '../shared';
import type {ToastState} from '../hooks/useToast';

export type ConfirmBox={heading:string;body:string;action:string;danger?:boolean;accept:()=>void};

/** Branded confirm dialog (never window.confirm). Cancel gets focus; Esc closes (App). */
export function ConfirmDialog({phase,box,onClose}:{phase:'in'|'out';box:ConfirmBox;onClose:()=>void}){
 return <div className={'scrim confirm-scrim phase-'+phase} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
   <div className={'confirm-symbol '+(box.danger?'danger':'')}><AlertTriangle size={23}/></div>
   <h2 id="confirm-title">{box.heading}</h2>
   <p id="confirm-body">{box.body}</p>
   <div className="dialog-actions">
    <button className="secondary" autoFocus onClick={onClose}>Cancel</button>
    <button className={box.danger?'danger-button':'primary'} onClick={()=>{const accept=box.accept;onClose();accept()}}>{box.action}</button>
   </div>
  </div>
 </div>;
}

export function Toast({phase,toast,motion,onDismiss}:{phase:'in'|'out';toast:NonNullable<ToastState>;motion:MotionLevel;onDismiss:()=>void}){
 return <div className={'toast phase-'+phase} key={toast.id} role="status">
  <Info size={17}/>{toast.text}
  <button aria-label="Dismiss" onClick={onDismiss}><X size={16}/></button>
  {motion!=='off'&&<span className="toast-timer"/>}
 </div>;
}

type QuickProps={
 phase:'in'|'out';inputRef:React.RefObject<HTMLInputElement|null>;
 query:string;setQuery:(q:string)=>void;index:number;setIndex:React.Dispatch<React.SetStateAction<number>>;
 items:Item[];glyphSrc:(item:Item)=>string|undefined;
 onRun:(item:Item)=>void;onClose:()=>void;onContextMenu:(item:Item,e:React.MouseEvent<HTMLElement>)=>void;
};
/** Ctrl+K / Ctrl+Alt+Space launcher. */
export function QuickLauncher({phase,inputRef,query,setQuery,index,setIndex,items,glyphSrc,onRun,onClose,onContextMenu}:QuickProps){
 return <div className={'scrim quick-scrim phase-'+phase} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="quick-panel" role="dialog" aria-modal="true" aria-label="Quick launcher">
   <label className="quick-input"><Search size={22}/><input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{
    if(e.key==='ArrowDown'){e.preventDefault();setIndex(i=>Math.min(i+1,items.length-1))}
    else if(e.key==='ArrowUp'){e.preventDefault();setIndex(i=>Math.max(0,i-1))}
    else if(e.key==='Enter'&&items[index]){onClose();onRun(items[index])}
   }} placeholder="Search apps, games, and shortcuts..."/><kbd>ESC</kbd></label>
   <div className="quick-items">{items.length?items.map((item,i)=>{const src=glyphSrc(item);return <button key={item.id} className={i===index?'quick-selected':''} onMouseEnter={()=>setIndex(i)} onClick={()=>{onClose();onRun(item)}} onContextMenu={e=>onContextMenu(item,e)}>
    <span className="quick-icon">{src?<img className="native-icon" src={src} alt="" decoding="async"/>:categoryIcon(item.category)}</span>
    <span><b>{item.name}</b><small>{item.category}</small></span>{i===index&&<kbd>↵</kbd>}
   </button>}):<p>No matching shortcuts. Add one from your library.</p>}</div>
   <div className="quick-footer">CTRL + K in Aether · CTRL + ALT + SPACE system-wide · ↑ ↓ to select · Enter to launch · Right-click for more</div>
  </div>
 </div>;
}
