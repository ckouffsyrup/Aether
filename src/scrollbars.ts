/**
 * v0.12 auto-hiding scrollbars.
 * Scrollbars are invisible until the user scrolls a container, points near its
 * right edge, or drags its thumb. CSS (style.css, "v0.12") handles the look; this
 * only toggles two classes on the scrolling element:
 *   is-scrolling   - set on scroll, cleared ~900 ms after the last scroll event
 *   is-scroll-hot  - pointer is over/near the scrollbar or dragging the thumb
 */
const IDLE_MS=900;
const EDGE_PX=18; // scrollbar is 14 px wide; a little slack makes it easy to grab

function findScroller(node:EventTarget|null):HTMLElement|null{
 for(let el=node instanceof Element?node as HTMLElement:null;el&&el!==document.documentElement;el=el.parentElement){
  if(el.scrollHeight>el.clientHeight+1){
   const overflow=getComputedStyle(el).overflowY;
   if(overflow==='auto'||overflow==='scroll')return el;
  }
 }
 return null;
}

export function installAutoHideScrollbars():()=>void{
 const timers=new WeakMap<Element,number>();
 const onScroll=(e:Event)=>{
  const el=e.target instanceof Element?e.target:null;if(!el)return;
  el.classList.add('is-scrolling');
  clearTimeout(timers.get(el));
  timers.set(el,window.setTimeout(()=>el.classList.remove('is-scrolling'),IDLE_MS));
 };

 let hot:HTMLElement|null=null;let dragging=false;let frame=0;let last:PointerEvent|null=null;
 const setHot=(el:HTMLElement|null)=>{if(el===hot)return;hot?.classList.remove('is-scroll-hot');hot=el;hot?.classList.add('is-scroll-hot')};
 const update=()=>{
  frame=0;if(!last||dragging)return;
  const scroller=findScroller(last.target);
  if(!scroller){setHot(null);return}
  const rect=scroller.getBoundingClientRect();
  setHot(rect.right-last.clientX<=EDGE_PX&&last.clientX<=rect.right?scroller:null);
 };
 const onMove=(e:PointerEvent)=>{last=e;if(!frame)frame=requestAnimationFrame(update)};
 const onDown=()=>{if(hot)dragging=true};
 const onUp=()=>{if(!dragging)return;dragging=false;if(!frame)frame=requestAnimationFrame(update)};
 const onLeave=(e:MouseEvent)=>{if(!e.relatedTarget&&!dragging){last=null;setHot(null)}};

 document.addEventListener('scroll',onScroll,{capture:true,passive:true});
 window.addEventListener('pointermove',onMove,{passive:true});
 window.addEventListener('pointerdown',onDown,{capture:true});
 window.addEventListener('pointerup',onUp,{capture:true});
 window.addEventListener('pointercancel',onUp,{capture:true});
 document.addEventListener('mouseout',onLeave);
 return()=>{
  document.removeEventListener('scroll',onScroll,{capture:true});
  window.removeEventListener('pointermove',onMove);
  window.removeEventListener('pointerdown',onDown,{capture:true});
  window.removeEventListener('pointerup',onUp,{capture:true});
  window.removeEventListener('pointercancel',onUp,{capture:true});
  document.removeEventListener('mouseout',onLeave);
  cancelAnimationFrame(frame);setHot(null);
 };
}
