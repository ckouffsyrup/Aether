import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, Check, Download, FolderOpen, HardDrive, Image as ImageIcon, Info, Keyboard, LayoutGrid, Monitor, Palette, RotateCcw, Save, ScanSearch, Search, Sparkles, Trash2, Upload, X} from 'lucide-react';
import {APP_VERSION, isDesktop, type MotionLevel, type Preferences} from './shared';

/**
 * v0.14 Settings: two-pane layout (section list + one section at a time),
 * search across every section, toggles / segmented buttons / filled sliders,
 * per-section reset, and a danger zone. All changes still apply instantly.
 */
type SectionId='appearance'|'background'|'motion'|'library'|'desktop'|'data'|'about';
const SECTIONS:{id:SectionId;label:string;icon:React.ReactNode;hint:string}[]=[
 {id:'appearance',label:'Appearance',icon:<Palette size={17}/>,hint:'Colors, corners, scale'},
 {id:'background',label:'Background',icon:<ImageIcon size={17}/>,hint:'Wallpaper and banner'},
 {id:'motion',label:'Motion',icon:<Sparkles size={17}/>,hint:'Animations'},
 {id:'library',label:'Library',icon:<LayoutGrid size={17}/>,hint:'Sorting, layout, sidebar'},
 {id:'desktop',label:'Desktop',icon:<Monitor size={17}/>,hint:'Startup, tray, hotkey'},
 {id:'data',label:'Data',icon:<HardDrive size={17}/>,hint:'Backups, apps, icons'},
 {id:'about',label:'About',icon:<Info size={17}/>,hint:'Version and storage'},
];
const SECTION_KEY='veyl.aether.settingsSection';

export type SettingsApi={
 prefs:Preferences;
 defaults:Preferences;
 setPref:<K extends keyof Preferences>(key:K,value:Preferences[K])=>void;
 setPrefs:(patch:Partial<Preferences>)=>void;
 motion:MotionLevel;osReducedMotion:boolean;
 wallpaperPreview:string;selectWallpaper:()=>void;clearWallpaper:()=>void;
 exportTheme:()=>void;importTheme:()=>void;
 exportBackup:()=>void;importBackup:()=>void;importNexusBar:()=>void;
 scanApps:()=>void;scanning:boolean;
 iconSummary:string;iconCaching:boolean;clearIconCache:()=>void;
 openQuickLauncher:()=>void;
 resetAllSettings:()=>void;clearLibrary:()=>void;libraryCount:number;
 dataFolder:string;openDataFolder:()=>void;
};

// ---------------- Controls ----------------
function Toggle({checked,onChange,disabled,label}:{checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean;label:string}){
 return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={'s-toggle'+(checked?' is-on':'')} onClick={()=>onChange(!checked)}><span className="s-toggle-knob"/></button>;
}
function Segmented<T extends string>({value,options,onChange,label}:{value:T;options:{value:T;label:string}[];onChange:(v:T)=>void;label:string}){
 return <div className="segmented" role="radiogroup" aria-label={label}>{options.map(o=><button key={o.value} type="button" role="radio" aria-checked={value===o.value} className={value===o.value?'is-on':''} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>;
}
function Slider({value,min,max,step=1,onChange,unit,label}:{value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;unit:string;label:string}){
 const fill=((value-min)/(max-min))*100;
 return <div className="s-slider"><input type="range" aria-label={label} min={min} max={max} step={step} value={value} style={{'--fill':`${fill}%`} as React.CSSProperties} onChange={e=>onChange(Number(e.target.value))}/><output>{value}{unit}</output></div>;
}
function ColorField({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}){
 return <label className="s-color" title={value}><span className="s-color-chip" style={{background:value}}/><span className="s-color-hex">{value.toUpperCase()}</span><input type="color" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}
function Mark({text,query}:{text:string;query:string}){
 if(!query)return <>{text}</>;
 const i=text.toLowerCase().indexOf(query.toLowerCase());
 if(i<0)return <>{text}</>;
 return <>{text.slice(0,i)}<mark>{text.slice(i,i+query.length)}</mark>{text.slice(i+query.length)}</>;
}

type Row={id:string;section:SectionId;title:string;desc?:string;keywords?:string;control?:React.ReactNode;block?:React.ReactNode;danger?:boolean};

export function SettingsPage({api}:{api:SettingsApi}){
 const [section,setSection]=useState<SectionId>(()=>{try{const v=localStorage.getItem(SECTION_KEY);return SECTIONS.some(s=>s.id===v)?v as SectionId:'appearance'}catch{return 'appearance'}});
 const [query,setQuery]=useState('');
 const searchRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{try{localStorage.setItem(SECTION_KEY,section)}catch{}},[section]);
 const p=api.prefs,d=api.defaults;
 const q=query.trim().toLowerCase();

 const rows:Row[]=useMemo(()=>[
  // ---- Appearance ----
  {id:'preview',section:'appearance',title:'Preview',keywords:'live preview',block:<div className="s-preview" aria-hidden="true">
   <div className="s-preview-side"><span className="s-preview-logo"/><i/><i className="on"/><i/><i/></div>
   <div className="s-preview-main"><div className="s-preview-bar"/><div className="s-preview-cards"><div className="s-preview-card"><span/><b/><em/></div><div className="s-preview-card hot"><span/><b/><em/></div><div className="s-preview-card"><span/><b/><em/></div></div></div>
  </div>},
  {id:'accent',section:'appearance',title:'Accent color',desc:'Buttons, highlights, selection and the logo glow.',keywords:'color theme highlight purple',control:<div className="s-inline">
   <div className="swatches">{['#916cff','#4b91ff','#e46dab','#32bba3','#ed9a54'].map(c=><button key={c} type="button" title={c} aria-label={`Accent ${c}`} className={'swatch '+(p.accent===c?'picked':'')} style={{background:c}} onClick={()=>api.setPref('accent',c)}>{p.accent===c?<Check size={15}/>:null}</button>)}</div>
   <ColorField value={p.accent} label="Custom accent" onChange={v=>api.setPref('accent',v)}/></div>},
  {id:'sidebarColor',section:'appearance',title:'Sidebar',desc:'Navigation background.',keywords:'color surface',control:<ColorField value={p.sidebarColor} label="Sidebar color" onChange={v=>api.setPref('sidebarColor',v)}/>},
  {id:'panelColor',section:'appearance',title:'Panels and surfaces',desc:'Main area behind your cards.',keywords:'color background surface',control:<ColorField value={p.panelColor} label="Panel color" onChange={v=>api.setPref('panelColor',v)}/>},
  {id:'cardColor',section:'appearance',title:'Shortcut cards',desc:'Card fill in the library.',keywords:'color card',control:<ColorField value={p.cardColor} label="Card color" onChange={v=>api.setPref('cardColor',v)}/>},
  {id:'textColor',section:'appearance',title:'Primary text',desc:'Headings and labels.',keywords:'color font text',control:<ColorField value={p.textColor} label="Text color" onChange={v=>api.setPref('textColor',v)}/>},
  {id:'radius',section:'appearance',title:'Corner radius',desc:'How rounded cards are.',keywords:'round corners shape',control:<Slider label="Corner radius" value={p.radius} min={2} max={32} unit="px" onChange={v=>api.setPref('radius',v)}/>},
  {id:'scale',section:'appearance',title:'Interface scale',desc:'Size of everything in the main area.',keywords:'zoom size bigger smaller',control:<Slider label="Interface scale" value={p.scale} min={85} max={120} step={5} unit="%" onChange={v=>api.setPref('scale',v)}/>},
  {id:'density',section:'appearance',title:'Density',desc:'Spacing inside cards and pages.',keywords:'spacing padding compact spacious',control:<Segmented label="Density" value={p.density} onChange={v=>api.setPref('density',v)} options={[{value:'compact',label:'Compact'},{value:'comfortable',label:'Comfortable'},{value:'spacious',label:'Spacious'}]}/>},
  {id:'theme',section:'appearance',title:'Theme file',desc:'Share your look. Shortcuts and wallpaper are never included.',keywords:'export import theme share json',control:<div className="s-inline"><button type="button" className="secondary" onClick={api.exportTheme}><Save size={15}/> Export</button><button type="button" className="secondary" onClick={api.importTheme}><Upload size={15}/> Import</button></div>},
  // ---- Background ----
  {id:'wallpaper',section:'background',title:'Wallpaper',desc:'PNG, JPEG, WebP, GIF or BMP up to 12 MB. Aether keeps its own copy.',keywords:'background image picture',block:<div className="s-wallpaper">
   <div className="s-wallpaper-thumb" style={api.wallpaperPreview?{backgroundImage:`url("${api.wallpaperPreview}")`}:undefined}>{!api.wallpaperPreview&&<ImageIcon size={22}/>}</div>
   <div className="s-wallpaper-text"><b>Wallpaper</b><span>{api.wallpaperPreview?'Showing behind the whole app.':'No wallpaper set.'}</span><div className="s-inline"><button type="button" className="secondary" onClick={api.selectWallpaper}><ImageIcon size={15}/> {api.wallpaperPreview?'Change':'Choose image'}</button>{p.wallpaper&&<button type="button" className="secondary" onClick={api.clearWallpaper}>Remove</button>}</div></div>
  </div>},
  {id:'wallpaperOpacity',section:'background',title:'Wallpaper strength',desc:'How visible the wallpaper is.',keywords:'opacity background',control:<Slider label="Wallpaper strength" value={p.wallpaperOpacity} min={0} max={70} unit="%" onChange={v=>api.setPref('wallpaperOpacity',v)}/>},
  {id:'heroOpacity',section:'background',title:'Home banner strength',desc:'Lower lets more wallpaper show through the welcome banner.',keywords:'hero banner opacity dashboard',control:<Slider label="Home banner strength" value={p.heroOpacity} min={0} max={95} unit="%" onChange={v=>api.setPref('heroOpacity',v)}/>},
  // ---- Motion ----
  {id:'motionLevel',section:'motion',title:'Motion level',keywords:'animation reduce effects splash startup',block:<div className="s-motion">
   {api.osReducedMotion&&<p className="s-note"><AlertTriangle size={14}/> Windows animation effects are off, so Aether stays still. Turn them on in Windows Settings → Accessibility → Visual effects.</p>}
   <div className="s-motion-cards" role="radiogroup" aria-label="Motion level">
    {([['off','Off','Everything is instant. No splash.'],['subtle','Subtle','Quick fades and slides. Short startup.'],['full','Full','Branded splash, ripples, glides and bursts.']] as const).map(([v,label,text])=>
     <button key={v} type="button" role="radio" aria-checked={p.motionLevel===v} className={'s-motion-card motion-demo demo-'+v+(p.motionLevel===v?' is-on':'')} onClick={()=>api.setPref('motionLevel',v)}>
      <span className="md-stage" aria-hidden="true"><span className="md-card"/><span className="md-card"/><span className="md-card"/><span className="md-ring"/></span>
      <b>{label}{p.motionLevel===v&&<Check size={14}/>}</b><span>{text}</span>
     </button>)}
   </div>
   <p className="s-help">Hover a card to preview it.</p>
  </div>},
  // ---- Library ----
  {id:'sort',section:'library',title:'Sort order',desc:'Dragging a shortcut switches to Custom.',keywords:'sort order arrange custom drag name recent',control:<select className="s-select" aria-label="Sort order" value={p.sort} onChange={e=>api.setPref('sort',e.target.value as Preferences['sort'])}><option value="name">A to Z</option><option value="recent">Recently used</option><option value="favorites">Favorites first</option><option value="most-used">Most launched</option><option value="custom">Custom (drag to arrange)</option></select>},
  {id:'layout',section:'library',title:'Layout',desc:'Cards or a streamlined list.',keywords:'grid list view',control:<Segmented label="Layout" value={p.layout} onChange={v=>api.setPref('layout',v)} options={[{value:'grid',label:'Grid'},{value:'list',label:'List'}]}/>},
  {id:'compact',section:'library',title:'Compact cards',desc:'Fit more shortcuts per row.',keywords:'small cards smaller',control:<Toggle label="Compact cards" checked={p.compact} onChange={v=>api.setPref('compact',v)}/>},
  {id:'categoriesMode',section:'library',title:'Categories in sidebar',desc:'Show, fold, or hide the category list.',keywords:'sidebar categories hide collapse',control:<Segmented label="Categories in sidebar" value={p.categoriesMode} onChange={v=>api.setPref('categoriesMode',v)} options={[{value:'show',label:'Show'},{value:'collapse',label:'Folded'},{value:'hide',label:'Hidden'}]}/>},
  {id:'greeting',section:'library',title:'Welcome heading',desc:'“Welcome to Aether.” on the Home banner.',keywords:'home greeting hero',control:<Toggle label="Welcome heading" checked={p.greeting} onChange={v=>api.setPref('greeting',v)}/>},
  {id:'sidebarCollapsed',section:'library',title:'Collapsed sidebar',desc:'Icon-only navigation.',keywords:'sidebar collapse icons',control:<Toggle label="Collapsed sidebar" checked={p.sidebarCollapsed} onChange={v=>api.setPref('sidebarCollapsed',v)}/>},
  {id:'sidebarWidth',section:'library',title:'Sidebar width',keywords:'sidebar size wide',control:<Slider label="Sidebar width" value={p.sidebarWidth} min={190} max={340} unit="px" onChange={v=>api.setPref('sidebarWidth',v)}/>},
  // ---- Desktop ----
  {id:'startWithWindows',section:'desktop',title:'Launch when Windows starts',desc:'Start Aether automatically when you sign in.',keywords:'startup login boot autostart',control:<Toggle label="Launch when Windows starts" disabled={!isDesktop()} checked={p.startWithWindows} onChange={v=>api.setPref('startWithWindows',v)}/>},
  {id:'startHidden',section:'desktop',title:'Start hidden in the tray',desc:'At sign-in, wait in the tray instead of opening the window.',keywords:'tray minimized hidden startup',control:<Toggle label="Start hidden in the tray" disabled={!isDesktop()||!p.startWithWindows} checked={p.startHidden} onChange={v=>api.setPref('startHidden',v)}/>},
  {id:'hotkey',section:'desktop',title:'Quick launcher hotkey',desc:'Opens Aether and its search from anywhere. Ctrl + K works inside Aether.',keywords:'shortcut keyboard hotkey quick launch search',control:<div className="s-inline"><span className="s-keys"><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Space</kbd></span><button type="button" className="secondary" onClick={api.openQuickLauncher}><Keyboard size={15}/> Try it</button></div>},
  {id:'close',section:'desktop',title:'Closing the window',desc:'Hides Aether to the system tray. Use Quit Aether in the tray menu to exit completely. Opening Aether again brings the existing window forward.',keywords:'tray close quit exit minimize'},
  // ---- Data ----
  {id:'backup',section:'data',title:'Backup',desc:'One file with every shortcut, icon, card image and setting. Importing replaces your library (you confirm first).',keywords:'export import backup restore json',control:<div className="s-inline"><button type="button" className="secondary" onClick={api.exportBackup}><Download size={15}/> Export</button><button type="button" className="secondary" onClick={api.importBackup}><Upload size={15}/> Import</button></div>},
  {id:'nexusbar',section:'data',title:'Import from NexusBar',desc:'Adds shortcuts from a NexusBar export. Existing entries are kept; duplicates are skipped.',keywords:'nexusbar legacy migrate import',control:<button type="button" className="secondary" onClick={api.importNexusBar}><Upload size={15}/> Import</button>},
  {id:'detect',section:'data',title:'Detect installed apps',desc:'Scans the Start Menu, registered App Paths and Windows apps. You confirm before anything is added.',keywords:'scan detect discover apps start menu',control:<button type="button" className="secondary" disabled={api.scanning} onClick={api.scanApps}><ScanSearch size={15}/> {api.scanning?'Scanning…':'Scan'}</button>},
  {id:'icons',section:'data',title:'Icon cache',desc:api.iconSummary,keywords:'icons cache clear refresh',control:<button type="button" className="secondary" disabled={api.iconCaching} onClick={api.clearIconCache}><RotateCcw size={15}/> Clear and rebuild</button>},
  {id:'resetAll',section:'data',danger:true,title:'Reset all settings',desc:'Every setting goes back to default and the wallpaper is removed. Your shortcuts stay.',keywords:'reset defaults danger',control:<button type="button" className="danger-ghost" onClick={api.resetAllSettings}><RotateCcw size={15}/> Reset</button>},
  {id:'clearLibrary',section:'data',danger:true,title:'Clear library',desc:`Removes all ${api.libraryCount} shortcuts with their icons and card images. Programs and files on your PC are not touched. Export a backup first.`,keywords:'delete remove all clear danger wipe',control:<button type="button" className="danger-ghost" disabled={!api.libraryCount} onClick={api.clearLibrary}><Trash2 size={15}/> Clear</button>},
  // ---- About ----
  {id:'about',section:'about',title:'Aether',keywords:'version veyl about',block:<div className="s-about"><img src="/aether.svg" alt=""/><div><b>Aether</b><span>Version {APP_VERSION} · A Veyl Studios project</span><span>Windows-first desktop hub. Automatic updates are planned.</span></div></div>},
  {id:'folder',section:'about',title:'Where your data lives',desc:api.dataFolder||'Aether keeps shortcuts in its webview storage, and images and icons in its app-data folder.',keywords:'folder appdata storage location files',control:<button type="button" className="secondary" disabled={!isDesktop()} onClick={api.openDataFolder}><FolderOpen size={15}/> Open folder</button>},
 ],[api,p]);

 const resetSection=(id:SectionId)=>{
  const pick=(keys:(keyof Preferences)[])=>Object.fromEntries(keys.map(k=>[k,d[k]])) as Partial<Preferences>;
  const map:Partial<Record<SectionId,(keyof Preferences)[]>>={
   appearance:['accent','sidebarColor','panelColor','cardColor','textColor','radius','scale','density'],
   background:['wallpaperOpacity','heroOpacity'],
   motion:['motionLevel'],
   library:['sort','layout','compact','categoriesMode','greeting','sidebarCollapsed','sidebarWidth'],
   desktop:['startHidden'],
  };
  const keys=map[id];if(keys)api.setPrefs(pick(keys));
 };

 const results=q?rows.filter(r=>`${r.title} ${r.desc??''} ${r.keywords??''}`.toLowerCase().includes(q)):[];
 const current=SECTIONS.find(s=>s.id===section)!;
 const renderRow=(r:Row)=>r.block
  ?<div key={r.id} className="s-block">{r.block}</div>
  :<div key={r.id} className={'s-row'+(r.danger?' is-danger':'')}><div className="s-text"><b><Mark text={r.title} query={query.trim()}/></b>{r.desc&&<span>{r.desc}</span>}</div>{r.control&&<div className="s-control">{r.control}</div>}</div>;

 return <div className="settings-layout">
  <nav className="settings-nav" aria-label="Settings sections">
   <div className="settings-title"><span className="section-kicker">PERSONALIZATION</span><h1>Settings</h1></div>
   <label className="settings-search"><Search size={16}/><input ref={searchRef} value={query} placeholder="Search settings" aria-label="Search settings" onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&query){e.stopPropagation();setQuery('')}}}/>{query&&<button type="button" className="icon-button" aria-label="Clear search" onClick={()=>{setQuery('');searchRef.current?.focus()}}><X size={14}/></button>}</label>
   <div className="settings-sections">{SECTIONS.map(s=><button key={s.id} type="button" className={'settings-tab'+(!q&&section===s.id?' is-on':'')} aria-current={!q&&section===s.id?'page':undefined} onClick={()=>{setQuery('');setSection(s.id)}}>{s.icon}<span><b>{s.label}</b><small>{s.hint}</small></span></button>)}</div>
  </nav>
  <div className="settings-body" key={q?'search':section}>
   {q?<>
    <header className="settings-head"><h2>Results for “{query.trim()}”</h2><p>{results.length?`${results.length} setting${results.length===1?'':'s'} found`:'No settings match. Try another word.'}</p></header>
    {SECTIONS.map(s=>{const hits=results.filter(r=>r.section===s.id);return hits.length?<section key={s.id} className="s-group"><button type="button" className="s-group-title" onClick={()=>{setQuery('');setSection(s.id)}}>{s.icon}{s.label}</button><div className="s-card">{hits.map(renderRow)}</div></section>:null})}
   </>:<>
    <header className="settings-head"><h2>{current.label}</h2><p>{current.hint}</p></header>
    <div className="s-card">{rows.filter(r=>r.section===section&&!r.danger).map(renderRow)}</div>
    {section==='data'&&<section className="s-group danger-zone"><div className="s-group-title"><AlertTriangle size={15}/> Danger zone</div><div className="s-card">{rows.filter(r=>r.section==='data'&&r.danger).map(renderRow)}</div></section>}
    {section!=='data'&&section!=='about'&&<button type="button" className="text-button s-reset" onClick={()=>resetSection(section)}><RotateCcw size={14}/> Reset {current.label.toLowerCase()} to defaults</button>}
   </>}
  </div>
 </div>;
}
