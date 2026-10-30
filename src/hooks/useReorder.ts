import {useMemo, useRef, useState} from 'react';
import {useEvent, type Item, type MotionLevel, type Preferences} from '../shared';
import {adoptOrder, moveItem} from '../lib/order';
import {beginPointerDrag, type ReorderHost} from '../reorder';
import type {Database} from '../lib/storage';

/**
 * Drag-to-reorder and Alt+arrow nudges. The first move in Library/Favorites
 * locks the on-screen order and switches the sort to Custom; Esc restores
 * both the order and the previous sort.
 */
export function useReorder(o:{
 setDb:React.Dispatch<React.SetStateAction<Database>>;
 dbRef:React.MutableRefObject<Database>;
 page:string;motion:MotionLevel;
 setPref:<K extends keyof Preferences>(k:K,v:Preferences[K])=>void;
 message:(t:string)=>void;
}){
 const [draggingId,setDraggingId]=useState<string|null>(null);
 const snapshot=useRef<{items:Item[];sort:Preferences['sort']}|null>(null);

 const adopt=(ids:string[])=>o.setDb(old=>{const items=adoptOrder(old.items,ids);return items===old.items?old:{...old,items}});
 const move=(dragId:string,targetId:string,after:boolean)=>o.setDb(old=>{const items=moveItem(old.items,dragId,targetId,after);return items===old.items?old:{...old,items}});
 const ensureCustomSort=()=>{
  if((o.page==='Library'||o.page==='Favorites')&&o.dbRef.current.preferences.sort!=='custom'){o.setPref('sort','custom');o.message('Switched to Custom order. Drag shortcuts to arrange them.')}
 };

 const begin=useEvent((id:string,ids:string[])=>{snapshot.current={items:o.dbRef.current.items,sort:o.dbRef.current.preferences.sort};adopt(ids);ensureCustomSort();setDraggingId(id)});
 const hostMove=useEvent(move);
 const cancel=useEvent(()=>{const snap=snapshot.current;if(snap)o.setDb(old=>({...old,items:snap.items,preferences:{...old.preferences,sort:snap.sort}}))});
 const end=useEvent(()=>{snapshot.current=null;setDraggingId(null)});
 const motion=useEvent(()=>o.motion);
 const host=useMemo<ReorderHost>(()=>({begin,move:hostMove,cancel,end,motion}),[]);

 const onDragStart=useEvent((item:Item,e:React.PointerEvent<HTMLDivElement>)=>beginPointerDrag(e.nativeEvent,e.currentTarget,item.id,host));
 const onNudge=useEvent((item:Item,delta:-1|1,el:HTMLElement)=>{
  const grid=el.parentElement;if(!grid)return;
  const ids=(Array.from(grid.children) as HTMLElement[]).map(c=>c.dataset.id).filter((x):x is string=>!!x);
  const i=ids.indexOf(item.id),j=i+delta;if(i<0||j<0||j>=ids.length)return;
  adopt(ids);ensureCustomSort();move(item.id,ids[j],delta>0);
 });
 return {draggingId,onDragStart,onNudge};
}
