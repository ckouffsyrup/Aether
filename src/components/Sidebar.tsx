import {ChevronDown, Clock3, Grid2X2, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings, Star} from 'lucide-react';
import {categories, type Preferences} from '../shared';

const NAV=[{label:'Home',icon:LayoutDashboard},{label:'Library',icon:Grid2X2},{label:'Favorites',icon:Star},{label:'Recent',icon:Clock3}];

type Props={
 prefs:Preferences;page:string;category:string;
 itemCount:number;favoriteCount:number;categoryCounts:Record<string,number>;
 setPref:<K extends keyof Preferences>(k:K,v:Preferences[K])=>void;
 /** Navigate to a page (resets category and search). */
 onPage:(page:string)=>void;
 onCategory:(category:string)=>void;
 onSettings:()=>void;
};

export function Sidebar({prefs,page,category,itemCount,favoriteCount,categoryCounts,setPref,onPage,onCategory,onSettings}:Props){
 return <aside className="sidebar">
  <button className="sidebar-toggle" title={prefs.sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setPref('sidebarCollapsed',!prefs.sidebarCollapsed)}>{prefs.sidebarCollapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  <div className="brand"><img src="/aether.svg" alt=""/><div><strong>AETHER</strong><span>BY VEYL STUDIOS</span></div></div>
  <div className="side-label">WORKSPACE</div>
  <nav>{NAV.map(({label,icon:Icon})=><button key={label} title={label} className={'nav-item '+(page===label?'chosen':'')} onClick={()=>onPage(label)}><Icon size={18}/><span>{label}</span>{label==='Favorites'&&favoriteCount>0&&<small>{favoriteCount}</small>}</button>)}</nav>
  {prefs.categoriesMode!=='hide'&&<>
   <button className="categories-heading" onClick={()=>setPref('categoriesMode',prefs.categoriesMode==='collapse'?'show':'collapse')}><span>CATEGORIES</span><ChevronDown size={15} style={{transform:prefs.categoriesMode==='collapse'?'rotate(-90deg)':undefined}}/></button>
   {prefs.categoriesMode==='show'&&<div className="side-cats">
    <button className={'catnav '+(category==='All'?'selected':'')} onClick={()=>onCategory('All')}>All applications <span>{itemCount}</span></button>
    {categories.map(c=><button className={'catnav '+(category===c?'selected':'')} key={c} onClick={()=>onCategory(c)}>{c}<span>{categoryCounts[c]||0}</span></button>)}
   </div>}
  </>}
  <div className="sidebar-bottom">
   <button title="Settings" className={'nav-item '+(page==='Settings'?'chosen':'')} onClick={onSettings}><Settings size={18}/><span>Settings</span></button>
   <div className="studio"><img src="/veyl.svg" alt=""/><div><b>Veyl Studios</b><span>Independent by design.</span></div></div>
  </div>
 </aside>;
}
