import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Check, ChevronRight} from 'lucide-react';

export type MenuEntry=
 |{kind:'item';id:string;label:string;icon?:React.ReactNode;hint?:string;danger?:boolean;disabled?:boolean;checked?:boolean;onSelect:()=>void}
 |{kind:'sub';id:string;label:string;icon?:React.ReactNode;children:MenuEntry[]}
 |{kind:'sep'}
 |{kind:'header';label:string};

const MARGIN=8;
const focusable=(e:MenuEntry)=>e.kind==='sub'||(e.kind==='item'&&!e.disabled);

type ListProps={entries:MenuEntry[];onClose:()=>void;anchor:{x:number;y:number};sub?:{parentRect:DOMRect};onBackOut?:()=>void;phase:'in'|'out'};

/** One menu panel. Submenus are positioned beside their row. */
function MenuList({entries,onClose,anchor,sub,onBackOut,phase}:ListProps){
 const ref=useRef<HTMLDivElement>(null);
 const [pos,setPos]=useState<{left:number;top:number;origin:string}|null>(null);
 const [active,setActive]=useState(()=>entries.findIndex(focusable));
 const [openSub,setOpenSub]=useState<{index:number;rect:DOMRect;viaKeyboard:boolean}|null>(null);
 const hoverTimer=useRef<number|undefined>(undefined);

 // Measure then place: keep inside the window, flip when there's no room.
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  const w=el.offsetWidth,h=el.offsetHeight,vw=window.innerWidth,vh=window.innerHeight;
  let left:number,top:number,ox='left',oy='top';
  if(sub){
   const r=sub.parentRect;
   left=r.right-4;if(left+w>vw-MARGIN){left=r.left-w+4;ox='right'}
   top=r.top-6;if(top+h>vh-MARGIN){top=Math.max(MARGIN,vh-MARGIN-h);oy='bottom'}
  }else{
   left=anchor.x;top=anchor.y;
   if(left+w>vw-MARGIN){left=Math.max(MARGIN,anchor.x-w);ox='right'}
   if(top+h>vh-MARGIN){top=Math.max(MARGIN,anchor.y-h);oy='bottom'}
  }
  setPos({left:Math.max(MARGIN,left),top:Math.max(MARGIN,top),origin:`${oy} ${ox}`});
 },[anchor.x,anchor.y,sub]);

 useEffect(()=>{if(pos)ref.current?.focus({preventScroll:true})},[pos!==null]);
 useEffect(()=>()=>clearTimeout(hoverTimer.current),[]);

 const rowRect=(index:number)=>ref.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.getBoundingClientRect();
 const step=(dir:1|-1)=>{
  if(!entries.some(focusable))return;
  let i=active;
  do{i=(i+dir+entries.length)%entries.length}while(!focusable(entries[i]));
  setActive(i);
 };
 const choose=(index:number,viaKeyboard:boolean)=>{
  const entry=entries[index];
  if(entry.kind==='sub'){const rect=rowRect(index);if(rect)setOpenSub({index,rect,viaKeyboard});return}
  if(entry.kind==='item'&&!entry.disabled){onClose();entry.onSelect()}
 };
 const onKeyDown=(e:React.KeyboardEvent)=>{
  e.stopPropagation();
  switch(e.key){
   case 'ArrowDown':e.preventDefault();step(1);break;
   case 'ArrowUp':e.preventDefault();step(-1);break;
   case 'Home':e.preventDefault();setActive(entries.findIndex(focusable));break;
   case 'End':{e.preventDefault();for(let i=entries.length-1;i>=0;i--)if(focusable(entries[i])){setActive(i);break}break}
   case 'Enter':case ' ':e.preventDefault();if(active>=0)choose(active,true);break;
   case 'ArrowRight':e.preventDefault();if(entries[active]?.kind==='sub')choose(active,true);break;
   case 'ArrowLeft':e.preventDefault();if(sub)onBackOut?.();break;
   case 'Escape':e.preventDefault();if(sub)onBackOut?.();else onClose();break;
   case 'Tab':e.preventDefault();onClose();break;
   default:
    // First-letter jump, cycling through matches.
    if(e.key.length===1&&/\S/.test(e.key)){
     const k=e.key.toLowerCase();
     for(let n=1;n<=entries.length;n++){const i=(active+n)%entries.length;const en=entries[i];if(focusable(en)&&'label' in en&&en.label.toLowerCase().startsWith(k)){setActive(i);break}}
    }
  }
 };

 // Submenus render as siblings (not children) so the parent's scale animation
 // can't turn their position:fixed into a transformed containing block.
 return <><div ref={ref} role="menu" tabIndex={-1} className={'ctx-menu'+(sub?' ctx-sub':'')+' phase-'+phase}
  style={{left:pos?.left??-9999,top:pos?.top??-9999,transformOrigin:pos?.origin,visibility:pos?'visible':'hidden'}}
  onKeyDown={onKeyDown} onContextMenu={e=>{e.preventDefault();e.stopPropagation()}} onMouseDown={e=>e.stopPropagation()}>
  {entries.map((entry,index)=>{
   if(entry.kind==='sep')return <div key={'sep'+index} className="ctx-sep" role="separator"/>;
   if(entry.kind==='header')return <div key={'h'+index} className="ctx-header">{entry.label}</div>;
   const isActive=index===active;
   const isOpen=openSub?.index===index;
   return <button key={entry.id} type="button" role="menuitem" tabIndex={-1} data-index={index}
    aria-haspopup={entry.kind==='sub'||undefined} aria-expanded={entry.kind==='sub'?isOpen:undefined}
    disabled={entry.kind==='item'&&entry.disabled}
    className={'ctx-item'+(isActive?' is-active':'')+(isOpen?' is-open':'')+(entry.kind==='item'&&entry.danger?' is-danger':'')}
    // mousemove (not mouseenter): a menu opened by keyboard under a resting
    // pointer must not lose its keyboard highlight until the mouse really moves.
    onMouseMove={()=>{
     if(active===index)return;
     setActive(index);clearTimeout(hoverTimer.current);
     if(entry.kind==='sub')hoverTimer.current=window.setTimeout(()=>{const rect=rowRect(index);if(rect)setOpenSub({index,rect,viaKeyboard:false})},120);
     else if(openSub)hoverTimer.current=window.setTimeout(()=>setOpenSub(null),180);
    }}
    onClick={()=>choose(index,false)}>
    <span className="ctx-icon">{entry.kind==='item'&&entry.checked?<Check size={15}/>:entry.icon}</span>
    <span className="ctx-label">{entry.label}</span>
    {entry.kind==='item'&&entry.hint&&<span className="ctx-hint">{entry.hint}</span>}
    {entry.kind==='sub'&&<ChevronRight size={14} className="ctx-chevron"/>}
   </button>;
  })}
 </div>
  {openSub&&entries[openSub.index]?.kind==='sub'&&<MenuList key={openSub.index} phase="in"
   entries={(entries[openSub.index] as Extract<MenuEntry,{kind:'sub'}>).children}
   anchor={anchor} sub={{parentRect:openSub.rect}} onClose={onClose}
   onBackOut={()=>{setOpenSub(null);ref.current?.focus({preventScroll:true})}}/>}
 </>;
}

export type ContextMenuProps={x:number;y:number;entries:MenuEntry[];phase:'in'|'out';onClose:()=>void};

/** Custom right-click menu. Closes on outside click, scroll, resize, or window blur. */
export function ContextMenu({x,y,entries,phase,onClose}:ContextMenuProps){
 useEffect(()=>{
  if(phase!=='in')return;
  const close=()=>onClose();
  const onDown=(e:MouseEvent)=>{if(!(e.target as HTMLElement)?.closest?.('.ctx-menu'))onClose()};
  window.addEventListener('mousedown',onDown);
  window.addEventListener('resize',close);
  window.addEventListener('blur',close);
  document.addEventListener('scroll',close,true);
  return()=>{window.removeEventListener('mousedown',onDown);window.removeEventListener('resize',close);window.removeEventListener('blur',close);document.removeEventListener('scroll',close,true)};
 },[phase,onClose]);
 return <div className="ctx-layer"><MenuList entries={entries} anchor={{x,y}} onClose={onClose} phase={phase}/></div>;
}
