import type {Item, Preferences} from '../shared';

/** The library array order is the Custom sort order. */

/** Rewrite the order so `ids` appear in that order, using the slots they already occupy. Others stay put. */
export function adoptOrder(items:Item[],ids:string[]):Item[]{
 const wanted=new Set(ids);const slots:number[]=[];
 items.forEach((x,i)=>{if(wanted.has(x.id))slots.push(i)});
 if(slots.length!==ids.length)return items;
 const byId=new Map(items.map(x=>[x.id,x]));const next=items.slice();
 ids.forEach((id,k)=>{next[slots[k]]=byId.get(id)!});
 return next;
}

/** Move `dragId` before/after `targetId`. Unknown ids leave the list unchanged. */
export function moveItem(items:Item[],dragId:string,targetId:string,after:boolean):Item[]{
 const next=items.slice();const from=next.findIndex(x=>x.id===dragId);if(from<0||dragId===targetId)return items;
 const [moved]=next.splice(from,1);const to=next.findIndex(x=>x.id===targetId);if(to<0)return items;
 next.splice(after?to+1:to,0,moved);return next;
}

/** Sort for the Library / Favorites / Recent pages. 'custom' keeps the stored order. */
export function sortItems(items:Item[],sort:Preferences['sort']):Item[]{
 if(sort==='custom')return items;
 return items.slice().sort((a,b)=>sort==='recent'?(b.lastOpened||0)-(a.lastOpened||0)
  :sort==='favorites'?Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name)
  :sort==='most-used'?(b.launchCount||0)-(a.launchCount||0)||a.name.localeCompare(b.name)
  :a.name.localeCompare(b.name));
}

/** Quick launcher ranking: exact name, prefix, contains, category, path; favorites and most-used break ties. */
export function quickLauncherResults(items:Item[],query:string,limit=12):Item[]{
 const q=query.toLowerCase().trim();
 const rank=(item:Item)=>{const name=item.name.toLowerCase();return !q?0:name===q?0:name.startsWith(q)?1:name.includes(q)?2:item.category.toLowerCase().includes(q)?3:item.target.toLowerCase().includes(q)?4:99};
 return items.filter(x=>rank(x)<99).sort((a,b)=>rank(a)-rank(b)||Number(b.favorite)-Number(a.favorite)||(b.launchCount||0)-(a.launchCount||0)||a.name.localeCompare(b.name)).slice(0,limit);
}
