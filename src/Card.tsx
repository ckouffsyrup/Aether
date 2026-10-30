import React, {memo, useState} from 'react';
import {ArrowUpRight, Edit3, Star, Trash2} from 'lucide-react';
import {categoryIcon, type Item, type MotionLevel} from './shared';

export type CardProps={
 item:Item;index:number;iconSrc?:string;artSrc?:string;
 bulkMode:boolean;selected:boolean;leaving:boolean;motion:MotionLevel;
 /** v0.13: can this card be dragged / Alt+arrowed in its grid? */
 reorderable:boolean;dragging:boolean;
 onDragStart:(item:Item,e:React.PointerEvent<HTMLDivElement>)=>void;
 onNudge:(item:Item,delta:-1|1,el:HTMLElement)=>void;
 onActivate:(item:Item)=>void;
 onToggleSelect:(id:string,checked?:boolean)=>void;
 onFavorite:(id:string)=>void;
 onEdit:(item:Item)=>void;
 onRemove:(item:Item)=>void;
 onMenu:(item:Item,x:number,y:number,opener:HTMLElement)=>void;
};

type Ripple={id:number;x:number;y:number};
let rippleSeed=0;

/** Defined outside App and memoized: cards no longer remount on every keystroke or toast. */
export const Card=memo(function Card({item,index,iconSrc,artSrc,bulkMode,selected,leaving,motion,reorderable,dragging,onDragStart,onNudge,onActivate,onToggleSelect,onFavorite,onEdit,onRemove,onMenu}:CardProps){
 const [ripples,setRipples]=useState<Ripple[]>([]);
 const [launching,setLaunching]=useState(0);
 const [burst,setBurst]=useState(0);
 const full=motion==='full';

 const activate=(e?:React.MouseEvent<HTMLDivElement>)=>{
  if(bulkMode){onToggleSelect(item.id);return}
  if(full){
   const rect=e?.currentTarget.getBoundingClientRect();
   const x=e&&rect?e.clientX-rect.left:(rect?.width??190)/2;const y=e&&rect?e.clientY-rect.top:(rect?.height??180)/2;
   setRipples(r=>[...r.slice(-3),{id:++rippleSeed,x,y}]);
   setLaunching(n=>n+1);
  }
  onActivate(item);
 };
 const openMenu=(el:HTMLElement,x?:number,y?:number)=>{
  const rect=el.getBoundingClientRect();
  onMenu(item,x??rect.left+Math.min(36,rect.width/2),y??rect.top+Math.min(36,rect.height/2),el);
 };
 const style:React.CSSProperties&Record<string,string|number>={'--i':Math.min(index,14)};
 if(artSrc){style['--card-image']=`url("${artSrc}")`;style['--card-position']=`${item.cardImageX??50}% ${item.cardImageY??50}%`}

 return <div
  className={'app-card'+(artSrc?' has-card-image':'')+(selected?' is-selected':'')+(leaving?' is-leaving':'')+(launching?' is-launching':'')+(dragging?' is-drag-source':'')}
  data-id={item.id} role="button" tabIndex={0} aria-label={`Launch ${item.name}`} style={style}
  aria-roledescription={reorderable?'Reorderable shortcut. Alt + arrow keys to move.':undefined}
  onPointerDown={e=>{if(reorderable)onDragStart(item,e)}}
  onClick={e=>activate(e)}
  onContextMenu={e=>{e.preventDefault();e.stopPropagation();const keyboard=e.clientX===0&&e.clientY===0;openMenu(e.currentTarget,keyboard?undefined:e.clientX,keyboard?undefined:e.clientY)}}
  onKeyDown={e=>{
   if(e.target!==e.currentTarget)return;
   if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}
   else if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();openMenu(e.currentTarget)}
   else if(reorderable&&e.altKey&&['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();onNudge(item,e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1,e.currentTarget)}
  }}>
  {full&&ripples.map(r=><span key={r.id} className="card-ripple" style={{left:r.x,top:r.y}} onAnimationEnd={()=>setRipples(list=>list.filter(x=>x.id!==r.id))}/>)}
  <div className="card-top">
   {bulkMode&&<input className="bulk-checkbox" aria-label={`Select ${item.name}`} type="checkbox" checked={selected} onClick={e=>e.stopPropagation()} onChange={e=>onToggleSelect(item.id,e.target.checked)}/>}
   <span className="app-glyph" key={launching} onAnimationEnd={()=>setLaunching(0)}>{iconSrc?<img className="native-icon" src={iconSrc} alt="" decoding="async" loading="lazy" draggable={false}/>:categoryIcon(item.category)}</span>
   <button title={item.favorite?'Remove favorite':'Add favorite'} className={'icon-button fave '+(item.favorite?'active':'')} onClick={e=>{e.stopPropagation();if(!item.favorite&&full)setBurst(n=>n+1);onFavorite(item.id)}}>
    <Star size={17} fill={item.favorite?'currentColor':'none'} key={burst} className={burst?'star-pop':undefined}/>
    {full&&burst>0&&<span className="star-burst" key={'b'+burst} aria-hidden="true"/>}
   </button>
  </div>
  <div className="app-title">{item.name}</div>
  <div className="app-category">{item.category}</div>
  <div className="card-bottom">
   <span className="launch">Open <ArrowUpRight size={15}/></span>
   <div className="actions">
    <button title="Edit" className="icon-button" onClick={e=>{e.stopPropagation();onEdit(item)}}><Edit3 size={15}/></button>
    <button title="Remove" className="icon-button" onClick={e=>{e.stopPropagation();onRemove(item)}}><Trash2 size={15}/></button>
   </div>
  </div>
 </div>;
});
