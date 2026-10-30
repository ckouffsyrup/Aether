import type {MotionLevel} from './shared';

/**
 * v0.13 drag-to-reorder. Pointer-based (no library): a press only becomes a
 * drag after 6 px of movement, so normal clicks still launch. While dragging,
 * a lifted copy follows the pointer, the real card stays in the grid as a
 * dashed placeholder, and the library order updates live (FlipGrid slides the
 * other cards). Edge auto-scroll, Esc cancels, and the click that follows a
 * drop is swallowed so it doesn't launch anything.
 */
export type ReorderHost={
 /** Drag started on this card; `ids` is the grid's on-screen order. */
 begin:(id:string,ids:string[])=>void;
 move:(dragId:string,targetId:string,after:boolean)=>void;
 cancel:()=>void;
 end:()=>void;
 motion:()=>MotionLevel;
};

const THRESHOLD=6;
const EDGE=72;
const HIT_COOLDOWN=90;

const gridIds=(grid:HTMLElement)=>(Array.from(grid.children) as HTMLElement[]).map(c=>c.dataset.id).filter((x):x is string=>!!x);

export function beginPointerDrag(e:PointerEvent|{button:number;isPrimary:boolean;clientX:number;clientY:number;target:EventTarget|null},card:HTMLElement,id:string,host:ReorderHost){
 if(e.button!==0||!e.isPrimary)return;
 if((e.target as HTMLElement|null)?.closest?.('button,input,a,select,textarea,label'))return;
 const grid=card.parentElement;if(!grid)return;
 const scroller=card.closest('.main') as HTMLElement|null;
 const list=grid.classList.contains('list-layout');
 const sx=e.clientX,sy=e.clientY;
 let px=sx,py=sy,started=false,done=false,raf=0,scrollRaf=0,lastHit=0;
 let ghost:HTMLDivElement|null=null;let base={left:0,top:0};

 const start=()=>{
  started=true;
  const r=card.getBoundingClientRect();base={left:r.left,top:r.top};
  const scale=card.offsetWidth?r.width/card.offsetWidth:1;
  ghost=document.createElement('div');ghost.className='drag-ghost';ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
  const copy=card.cloneNode(true) as HTMLElement;
  copy.removeAttribute('data-id');copy.removeAttribute('tabindex');
  copy.classList.remove('is-launching','is-leaving','is-selected');
  Object.assign(copy.style,{width:`${card.offsetWidth}px`,height:`${card.offsetHeight}px`,zoom:String(scale)});
  ghost.appendChild(copy);
  (card.closest('.shell')??document.body).appendChild(ghost);
  document.documentElement.classList.add('is-reordering');
  host.begin(id,gridIds(grid));
  requestAnimationFrame(()=>ghost?.classList.add('is-lifted'));
  scrollRaf=requestAnimationFrame(autoScroll);
 };

 const hitTest=()=>{
  if(performance.now()-lastHit<HIT_COOLDOWN)return;
  const under=document.elementFromPoint(px,py) as HTMLElement|null;
  const target=under?.closest?.('.app-card[data-id]') as HTMLElement|null;
  if(!target||target.parentElement!==grid)return;
  const targetId=target.dataset.id!;if(targetId===id)return;
  const r=target.getBoundingClientRect();
  const after=list?py>r.top+r.height/2:py>r.bottom?true:py<r.top?false:px>r.left+r.width/2;
  const ids=gridIds(grid);const di=ids.indexOf(id),ti=ids.indexOf(targetId);
  if((after&&di===ti+1)||(!after&&di===ti-1))return; // already there
  lastHit=performance.now();
  host.move(id,targetId,after);
 };

 const frame=()=>{raf=0;if(!ghost)return;ghost.style.transform=`translate(${px-sx}px,${py-sy}px)`;hitTest()};

 const autoScroll=()=>{
  if(done||!scroller)return;
  const r=scroller.getBoundingClientRect();
  const v=py<r.top+EDGE?-Math.ceil((r.top+EDGE-py)/5):py>r.bottom-EDGE?Math.ceil((py-(r.bottom-EDGE))/5):0;
  if(v){scroller.scrollTop+=v;hitTest()}
  scrollRaf=requestAnimationFrame(autoScroll);
 };

 const onMove=(ev:PointerEvent)=>{
  px=ev.clientX;py=ev.clientY;
  if(!started){if(Math.hypot(px-sx,py-sy)<THRESHOLD)return;start()}
  if(!raf)raf=requestAnimationFrame(frame);
 };

 const swallowNextClick=()=>{
  const swallow=(ce:MouseEvent)=>{ce.stopPropagation();ce.preventDefault()};
  window.addEventListener('click',swallow,{capture:true,once:true});
  // The click (if any) follows pointerup in the same turn; drop the trap right after.
  const release=()=>setTimeout(()=>window.removeEventListener('click',swallow,{capture:true}),0);
  window.addEventListener('pointerup',release,{once:true,capture:true});
  setTimeout(release,1500);
 };

 const finish=(cancelled:boolean,fromPointerUp:boolean)=>{
  if(done)return;done=true;
  window.removeEventListener('pointermove',onMove);
  window.removeEventListener('pointerup',onUp,true);
  window.removeEventListener('pointercancel',onCancel,true);
  window.removeEventListener('keydown',onKey,true);
  cancelAnimationFrame(raf);cancelAnimationFrame(scrollRaf);
  if(!started)return;
  document.documentElement.classList.remove('is-reordering');
  if(fromPointerUp){const swallow=(ce:MouseEvent)=>{ce.stopPropagation();ce.preventDefault()};window.addEventListener('click',swallow,{capture:true,once:true});setTimeout(()=>window.removeEventListener('click',swallow,{capture:true}),0)}
  else swallowNextClick();
  if(cancelled)host.cancel();
  const g=ghost;if(!g){host.end();return}
  const ms=host.motion()==='off'?0:host.motion()==='full'?220:160;
  // Let React apply the final order, then fly the copy into the card's slot.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const r=card.getBoundingClientRect();
   if(!ms){g.remove();host.end();return}
   g.classList.remove('is-lifted');
   g.style.transition=`transform ${ms}ms cubic-bezier(.2,.8,.2,1)`;
   g.style.transform=`translate(${r.left-base.left}px,${r.top-base.top}px)`;
   setTimeout(()=>{g.remove();host.end()},ms);
  }));
 };
 const onUp=()=>finish(false,true);
 const onCancel=()=>finish(true,false);
 const onKey=(ev:KeyboardEvent)=>{if(ev.key==='Escape'&&started){ev.preventDefault();ev.stopPropagation();finish(true,false)}};

 window.addEventListener('pointermove',onMove);
 window.addEventListener('pointerup',onUp,true);
 window.addEventListener('pointercancel',onCancel,true);
 window.addEventListener('keydown',onKey,true);
}
