import React from 'react';
import {ArrowUpRight, ChevronDown, Plus, Search, X} from 'lucide-react';
import {categories, type Category, type Item} from '../shared';

type HomeProps={
 greeting:boolean;itemCount:number;categoryTotal:number;favorites:Item[];recent:Item[];
 renderGrid:(items:Item[],reorderable?:boolean)=>React.ReactNode;
 onAdd:()=>void;onPage:(page:string)=>void;
};
export function HomePage({greeting,itemCount,categoryTotal,favorites,recent,renderGrid,onAdd,onPage}:HomeProps){
 const pad=(n:number)=>n.toString().padStart(2,'0');
 return <>
  <div className="hero">
   <div className="hero-content"><div className="eyebrow"><span className="status-dot"/> YOUR PERSONAL DESKTOP SPACE</div><h1>{greeting?'Welcome to Aether.':'Your space, your way.'}</h1><p>Everything you use, beautifully organized. Make it yours.</p><button className="primary" onClick={onAdd}><Plus size={17}/> Add an application</button></div>
   <svg className="hero-mark hero-prism" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 14 L108 98 L12 98 Z M60 14 L60 70 M12 98 L60 70 L108 98 M60 40 L69 58 L51 58 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
  </div>
  <div className="stat-row">
   <div><span>APPLICATIONS</span><strong>{pad(itemCount)}</strong><small>In your library</small></div>
   <div><span>FAVORITES</span><strong>{pad(favorites.length)}</strong><small>Quick access</small></div>
   <div><span>CATEGORIES</span><strong>{pad(categoryTotal)}</strong><small>Organized collections</small></div>
  </div>
  <section><div className="section-head"><div><span className="section-kicker">YOUR ESSENTIALS</span><h2>Favorites</h2></div><button className="text-button" onClick={()=>onPage('Favorites')}>View all <ArrowUpRight size={16}/></button></div>
   {favorites.length?renderGrid(favorites.slice(0,6)):<div className="hint">Star applications from your library to keep your favorites here.</div>}</section>
  <section><div className="section-head"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recently opened</h2></div><button className="text-button" onClick={()=>onPage('Recent')}>View all <ArrowUpRight size={16}/></button></div>
   {recent.length?renderGrid(recent.slice(0,6),false):<div className="hint">Launch an application and it will appear here.</div>}</section>
 </>;
}

type LibraryProps={
 page:string;visible:Item[];
 query:string;setQuery:(q:string)=>void;searchRef:React.RefObject<HTMLInputElement|null>;
 category:string;setCategory:(c:string)=>void;
 bulkMode:boolean;toggleBulk:()=>void;selectedIds:string[];setSelectedIds:(ids:string[])=>void;
 moveTo:(ids:string[],c:Category)=>void;setFavorites:(ids:string[],v:boolean)=>void;removeMany:(ids:string[])=>void;
 renderGrid:(items:Item[])=>React.ReactNode;
};
const SUBTITLE:Record<string,string>={Library:'All your apps, sites, and folders in one place.',Favorites:'The shortcuts that matter most.',Recent:'The things you opened most recently.'};
/** Library, Favorites and Recent share this layout. */
export function LibraryPage({page,visible,query,setQuery,searchRef,category,setCategory,bulkMode,toggleBulk,selectedIds,setSelectedIds,moveTo,setFavorites,removeMany,renderGrid}:LibraryProps){
 return <>
  <div className="page-heading"><span className="section-kicker">ORGANIZED YOUR WAY</span><h1>{page}</h1><p>{SUBTITLE[page]??SUBTITLE.Recent}</p></div>
  <div className="library-controls">
   <label className="searchfield"><Search size={19}/><input ref={searchRef} value={query} placeholder="Search your shortcuts..." onChange={e=>setQuery(e.target.value)}/>{query&&<button className="icon-button" onClick={()=>setQuery('')}><X size={16}/></button>}</label>
   <div className="filter"><span>Category</span><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={15}/></div>
  </div>
  <div className="bulk-tools">
   <button className="secondary" onClick={toggleBulk}>{bulkMode?'Finish organizing':'Select shortcuts'}</button>
   {bulkMode&&<>
    <button className="secondary" onClick={()=>setSelectedIds(visible.map(x=>x.id))}>Select visible ({visible.length})</button>
    <button className="secondary" onClick={()=>setSelectedIds([])}>Clear</button>
    <span className="muted">{selectedIds.length} selected</span>
    <select aria-label="Move selected shortcuts to category" defaultValue="" onChange={e=>{if(!e.target.value)return;moveTo(selectedIds,e.target.value as Category);setSelectedIds([]);e.target.value=''}}><option value="">Move to category…</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
    <button className="secondary" disabled={!selectedIds.length} onClick={()=>setFavorites(selectedIds,true)}>Favorite selected</button>
    <button className="danger-button" disabled={!selectedIds.length} onClick={()=>removeMany(selectedIds)}>Remove selected</button>
   </>}
  </div>
  <div className="results-count">{visible.length} {visible.length===1?'shortcut':'shortcuts'}</div>
  {renderGrid(visible)}
 </>;
}
