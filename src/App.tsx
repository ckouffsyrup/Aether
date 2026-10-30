import React, {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';
import {Layers3, Plus} from 'lucide-react';
import {copyText, isDesktop, useEvent, type Category, type Item} from './shared';
import {Card} from './Card';
import {ContextMenu, type MenuEntry} from './ContextMenu';
import {ShortcutEditor, type EditorValues} from './ShortcutEditor';
import {Splash} from './Splash';
import {FlipGrid} from './FlipGrid';
import {SettingsPage, type SettingsApi} from './SettingsPage';
import {exitDuration, useLatest, useMotionLevel, usePresence} from './motion';
import {installAutoHideScrollbars} from './scrollbars';
import {Sidebar} from './components/Sidebar';
import {Toolbar} from './components/Toolbar';
import {HomePage, LibraryPage} from './components/Pages';
import {ConfirmDialog, QuickLauncher, Toast, type ConfirmBox} from './components/Overlays';
import {useToast} from './hooks/useToast';
import {useDatabase} from './hooks/useDatabase';
import {useWallpaper} from './hooks/useWallpaper';
import {useLibraryFiles} from './hooks/useLibraryFiles';
import {useIconCache} from './hooks/useIconCache';
import {useReorder} from './hooks/useReorder';
import {errorText, launch, native} from './lib/native';
import {blobToDataUrl, formatBytes, mimeForFile, prepareCardImage, readIconFile} from './lib/images';
import {DEFAULT_PREFERENCES, MOTION_LEVELS, PAGE_KEY, migratePreferences, sanitizeBackupItems} from './lib/storage';
import {guessCategory, normalizeTarget, parseLegacy, sanitizeTheme} from './lib/importers';
import {quickLauncherResults, sortItems} from './lib/order';
import {itemMenu, selectionMenu, wrapEntries, type MenuActions} from './lib/menus';

type MenuState={x:number;y:number;entries:MenuEntry[];opener:HTMLElement|null};
const reducedMotionNow=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App({launchedAtLogin}:{launchedAtLogin:boolean}){
 const {toast,message,dismiss:dismissToast}=useToast();
 const {db,setDb,dbRef,setPref,setPrefs}=useDatabase(()=>message('Aether storage is full. Export a backup and remove large custom icons.'));
 const prefs=db.preferences;
 const motion=useMotionLevel(prefs.motionLevel);

 // ---- Startup: splash (Full), arrival (Subtle), or hidden in the tray (sign-in launch) ----
 const [startHidden]=useState(()=>launchedAtLogin&&prefs.startHidden);
 const [boot,setBoot]=useState<'splash'|'arrive'|'done'>(()=>{if(startHidden)return 'done';const m=reducedMotionNow()?'off':prefs.motionLevel;return m==='full'?'splash':m==='subtle'?'arrive':'done'});
 const [splashMounted,setSplashMounted]=useState(boot==='splash');
 const [splashSkip,setSplashSkip]=useState(0);
 useEffect(()=>{
  // The native window starts hidden; show it after the first paint (no white flash).
  if(!isDesktop()||startHidden)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{import('@tauri-apps/api/window').then(({getCurrentWindow})=>{const w=getCurrentWindow();return w.show().then(()=>w.setFocus())}).catch(()=>{})}));
 },[]);
 useEffect(()=>{if(boot!=='arrive')return;const t=window.setTimeout(()=>setBoot('done'),950);return()=>clearTimeout(t)},[boot]);
 useEffect(()=>installAutoHideScrollbars(),[]);

 // ---- UI state ----
 const [page,setPage]=useState(()=>localStorage.getItem(PAGE_KEY)||'Home');
 useEffect(()=>{localStorage.setItem(PAGE_KEY,page)},[page]);
 const [query,setQuery]=useState('');const [category,setCategory]=useState('All');
 const [selectedIds,setSelectedIds]=useState<string[]>([]);const [bulkMode,setBulkMode]=useState(false);
 const [palette,setPalette]=useState(false);const [paletteQuery,setPaletteQuery]=useState('');const [paletteIndex,setPaletteIndex]=useState(0);const paletteRef=useRef<HTMLInputElement>(null);
 const [modal,setModal]=useState(false);const [editor,setEditor]=useState<{item?:Item;key:number}|null>(null);
 const [confirmBox,setConfirmBox]=useState<ConfirmBox|null>(null);
 const [menu,setMenu]=useState<MenuState|null>(null);
 const [leaving,setLeaving]=useState<ReadonlySet<string>>(()=>new Set());
 const [scanning,setScanning]=useState(false);
 const [dataFolder,setDataFolder]=useState('');
 const searchRef=useRef<HTMLInputElement>(null);
 const fileRef=useRef<HTMLInputElement>(null);const legacyRef=useRef<HTMLInputElement>(null);const themeFileRef=useRef<HTMLInputElement>(null);
 const iconFileRef=useRef<HTMLInputElement>(null);const cardFileRef=useRef<HTMLInputElement>(null);
 /** Set when a context-menu "Change icon / card art" opens the file picker directly. */
 const quickPickTarget=useRef<{id:string;field:'icon'|'art'}|null>(null);

 // ---- Exit animations ----
 const modalPhase=usePresence(modal,exitDuration(motion,170));
 const palettePhase=usePresence(palette,exitDuration(motion,140));
 const confirmPhase=usePresence(confirmBox!==null,exitDuration(motion,150));const confirmShown=useLatest(confirmBox);
 const menuPhase=usePresence(menu!==null,exitDuration(motion,110,90));const menuShown=useLatest(menu);
 const toastPhase=usePresence(toast!==null,exitDuration(motion,200));const toastShown=useLatest(toast);

 // ---- Files, icons, wallpaper ----
 const wallpaper=useWallpaper(prefs.wallpaper,setPref,message);
 const files=useLibraryFiles(db,setDb,message);
 const iconCache=useIconCache(db.items,{settle:boot==='done',statsWanted:page==='Settings',message});
 /** What a card shows: custom icon, else the cached Windows icon, else (undefined) the category glyph. */
 const glyphSrc=(item:Item)=>files.customIconSrc(item)||iconCache.iconSrcFor(item.target);

 // ---- Global keys and native events ----
 const onGlobalKey=useEvent((e:KeyboardEvent)=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(v=>!v);setPaletteQuery('');return}
  if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();setPalette(false);setModal(false);setPage('Settings');setCategory('All');return}
  if(e.key==='Escape'){if(confirmBox)setConfirmBox(null);else if(palette)setPalette(false);else if(modal)setModal(false)} // topmost layer only
 });
 useEffect(()=>{const listener=(e:KeyboardEvent)=>onGlobalKey(e);window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[onGlobalKey]);
 // Replace the stock WebView2 menu everywhere except text fields (Shift+right-click keeps it in dev builds).
 useEffect(()=>{const h=(e:MouseEvent)=>{const t=e.target as HTMLElement|null;if(t?.closest?.('input,textarea,[contenteditable="true"]'))return;if(import.meta.env.DEV&&e.shiftKey)return;e.preventDefault()};window.addEventListener('contextmenu',h);return()=>window.removeEventListener('contextmenu',h)},[]);
 useEffect(()=>{if(palette)setTimeout(()=>paletteRef.current?.focus(),0)},[palette]);
 useEffect(()=>setPaletteIndex(0),[paletteQuery,palette]);
 useEffect(()=>{if(!isDesktop())return;let unlisten:(()=>void)|undefined;import('@tauri-apps/api/event').then(({listen})=>listen('aether:show-search',()=>{setSplashSkip(n=>n+1);setPalette(true);setPaletteQuery('')})).then(fn=>{unlisten=fn}).catch(()=>{});return()=>unlisten?.()},[]);
 useEffect(()=>{if(!isDesktop())return;import('@tauri-apps/plugin-autostart').then(async({enable,disable,isEnabled})=>{
  // enable() rewrites the Windows login entry, so older entries pick up the --autostart flag.
  if(prefs.startWithWindows)await enable();else if(await isEnabled())await disable();
 }).catch(()=>{})},[prefs.startWithWindows]);
 useEffect(()=>{if(page==='Settings'&&isDesktop()&&!dataFolder)native<string>('app_data_folder').then(setDataFolder).catch(()=>{})},[page]);

 // ---- Derived data ----
 const recent=useMemo(()=>db.items.filter(x=>x.lastOpened).sort((a,b)=>(b.lastOpened||0)-(a.lastOpened||0)),[db.items]);
 const favorites=useMemo(()=>db.items.filter(x=>x.favorite),[db.items]);
 const categoryCounts=useMemo(()=>{const c:Record<string,number>={};for(const x of db.items)c[x.category]=(c[x.category]||0)+1;return c},[db.items]);
 const searchIndex=useMemo(()=>new Map(db.items.map(x=>[x.id,`${x.name} ${x.category} ${x.target}`.toLowerCase()])),[db.items]);
 const deferredQuery=useDeferredValue(query);
 const visible=useMemo(()=>{
  const q=deferredQuery.toLowerCase();
  const source=page==='Favorites'?favorites:page==='Recent'?recent:db.items;
  return sortItems(source.filter(x=>(category==='All'||x.category===category)&&(!q||searchIndex.get(x.id)!.includes(q))),prefs.sort);
 },[db.items,favorites,recent,page,category,deferredQuery,searchIndex,prefs.sort]);
 const paletteItems=useMemo(()=>quickLauncherResults(db.items,paletteQuery),[db.items,paletteQuery]);

 // ---- Actions (stable identities so memoized cards don't re-render) ----
 const updateItems=(ids:Iterable<string>,patch:(x:Item)=>Item)=>{const set=new Set(ids);setDb(old=>({...old,items:old.items.map(x=>set.has(x.id)?patch(x):x)}))};
 const ask=useEvent((heading:string,body:string,action:string,accept:()=>void,danger:boolean=false)=>setConfirmBox({heading,body,action,accept,danger}));
 const animateOut=useEvent((ids:string[],finish:()=>void)=>{
  const ms=exitDuration(motion,210,150);if(!ms){finish();return}
  setLeaving(new Set(ids));window.setTimeout(()=>{finish();setLeaving(new Set())},ms);
 });
 const startAdd=useEvent((item?:Item)=>{quickPickTarget.current=null;setEditor({item,key:Date.now()});setModal(true)});
 const run=useEvent(async(item:Item,verb:'open'|'runas'='open')=>{
  try{await launch(item.target,verb);updateItems([item.id],x=>({...x,lastOpened:Date.now(),launchCount:(x.launchCount||0)+1}))}
  catch(e){const text=errorText(e,'Unable to open target');if(text!=='cancelled')message(text)}
 });
 const reveal=useEvent((item:Item)=>{native('reveal_in_explorer',{target:item.target}).catch(e=>message(errorText(e,'Could not open File Explorer')))});
 const toggleFavorite=useEvent((id:string)=>updateItems([id],x=>({...x,favorite:!x.favorite})));
 const setFavorites=useEvent((ids:string[],value:boolean)=>{updateItems(ids,x=>({...x,favorite:value}));message(value?`Added ${ids.length===1?'shortcut':ids.length+' shortcuts'} to favorites`:`Removed ${ids.length===1?'shortcut':ids.length+' shortcuts'} from favorites`)});
 const moveTo=useEvent((ids:string[],next:Category)=>{updateItems(ids,x=>({...x,category:next}));message(ids.length===1?`Moved to ${next}`:`Moved ${ids.length} shortcuts to ${next}`)});
 const resetStats=useEvent((ids:string[])=>{updateItems(ids,x=>({...x,lastOpened:undefined,launchCount:0}));message('Launch stats reset')});
 const removeIds=useEvent((ids:string[])=>{
  const set=new Set(ids);
  animateOut(ids,()=>{
   const doomed=dbRef.current.items.filter(x=>set.has(x.id));
   setDb(old=>({...old,items:old.items.filter(x=>!set.has(x.id))}));
   doomed.forEach(x=>{files.deleteFile(x.cardArt);files.deleteFile(x.iconFile)});
   setSelectedIds(old=>old.filter(id=>!set.has(id)));
   message(ids.length===1?'Shortcut removed':`${ids.length} shortcuts removed`);
  });
 });
 const remove=useEvent((item:Item)=>ask('Remove shortcut?',`Remove “${item.name}” from your Aether library? The actual program or file will not be deleted.`,'Remove shortcut',()=>removeIds([item.id]),true));
 const removeMany=useEvent((ids:string[])=>ask('Remove selected shortcuts?',`Remove ${ids.length} shortcuts from Aether? The installed apps will not be deleted.`,'Remove shortcuts',()=>removeIds(ids),true));
 const toggleSelect=useEvent((id:string,checked?:boolean)=>setSelectedIds(old=>{const has=old.includes(id);const want=checked??!has;return want?(has?old:[...old,id]):old.filter(x=>x!==id)}));
 const quickPick=useEvent((id:string,field:'icon'|'art')=>{quickPickTarget.current={id,field};(field==='icon'?iconFileRef:cardFileRef).current?.click()});
 const resetIcon=useEvent((item:Item)=>{updateItems([item.id],x=>({...x,icon:undefined,iconFile:undefined}));files.deleteFile(item.iconFile);message('Using the automatic icon')});

 // Context-menu "Change icon / card art" applies straight to the shortcut.
 const onIconFile=async(file?:File)=>{
  const quick=quickPickTarget.current;quickPickTarget.current=null;if(!file||!quick)return;
  try{
   const stored=await files.storeIcon(quick.id,await readIconFile(file));
   const previous=dbRef.current.items.find(x=>x.id===quick.id)?.iconFile;
   updateItems([quick.id],x=>({...x,iconFile:stored.iconFile,icon:stored.icon}));
   if(previous&&previous!==stored.iconFile)files.deleteFile(previous);
   message('Icon updated');
  }catch(e){message(errorText(e))}
 };
 const onCardFile=async(file?:File)=>{
  const quick=quickPickTarget.current;quickPickTarget.current=null;if(!file||!quick)return;
  try{
   const stored=await files.storeArt(quick.id,await prepareCardImage(file));
   const previous=dbRef.current.items.find(x=>x.id===quick.id)?.cardArt;
   updateItems([quick.id],x=>({...x,cardArt:stored.cardArt,cardImage:stored.cardImage,cardImageX:50,cardImageY:50}));
   if(previous&&previous!==stored.cardArt)files.deleteFile(previous);
   message('Card art updated. Use Edit to adjust framing.');
  }catch(e){message(`Could not prepare image: ${errorText(e)}`)}
 };

 const saveEditor=async(values:EditorValues)=>{
  const existing=editor?.item?db.items.find(x=>x.id===editor.item!.id):undefined;
  const id=existing?.id||crypto.randomUUID();
  let art:{cardArt?:string;cardImage?:string}={cardArt:values.art.file};
  if(values.art.data)art=values.art.data===existing?.cardImage&&!files.artDir?{cardImage:values.art.data}:await files.storeArt(id,values.art.data);
  let iconPart:{iconFile?:string;icon?:string}={iconFile:values.icon.file};
  if(values.icon.data)iconPart=values.icon.data===existing?.icon&&!files.artDir?{icon:values.icon.data}:await files.storeIcon(id,values.icon.data);
  const item:Item={id,name:values.name,target:values.target,category:values.category,favorite:values.favorite,...iconPart,...art,cardImageX:values.cardImageX,cardImageY:values.cardImageY,launchCount:existing?.launchCount||0,lastOpened:existing?.lastOpened};
  setDb(old=>({...old,items:existing?old.items.map(x=>x.id===id?item:x):[...old.items,item]}));
  if(existing?.cardArt&&existing.cardArt!==item.cardArt)files.deleteFile(existing.cardArt);
  if(existing?.iconFile&&existing.iconFile!==item.iconFile)files.deleteFile(existing.iconFile);
  setModal(false);message(existing?'Shortcut updated':'Shortcut added');
 };
 const readDroppedImage=async(path:string)=>{
  const bytes=await native<ArrayBuffer>('read_image_file',{path});
  return new File([bytes],path.split(/[\\/]/).pop()||'image',{type:mimeForFile(path)});
 };
 const browseTarget=async(folder=false):Promise<string|null>=>{
  if(!isDesktop()){message('Native selection requires the desktop build.');return null}
  try{const {open}=await import('@tauri-apps/plugin-dialog');const choice=await open(folder?{directory:true,multiple:false}:{directory:false,multiple:false,filters:[{name:'Programs and shortcuts',extensions:['exe','lnk','url','bat','cmd','ps1']}]});return typeof choice==='string'?choice:null}
  catch(e){message(errorText(e,'File selection failed'));return null}
 };

 // ---- Backups, imports, themes ----
 const downloadJson=(data:unknown,name:string)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const exportData=async()=>{
  // Image files are embedded so a backup restores on any machine.
  const embed=async(file:string)=>{const bytes=await native<ArrayBuffer>('read_card_art',{file});return blobToDataUrl(new Blob([bytes],{type:mimeForFile(file,'image/webp')}))};
  const items=await Promise.all(db.items.map(async x=>{
   const {cardArt,iconFile,...rest}=x;const out:Item={...rest};
   if(cardArt){try{out.cardImage=await embed(cardArt)}catch{}}
   if(iconFile){try{out.icon=await embed(iconFile)}catch{}}
   return out;
  }));
  downloadJson({version:2,items,preferences:{...prefs,motion:prefs.motionLevel!=='off'}},'aether-backup.json');message('Backup exported');
 };
 const importData=async(file?:File)=>{
  if(!file)return;
  try{
   const input=JSON.parse(await file.text());const safe=sanitizeBackupItems(input.items);
   ask('Replace your library?',`This will replace the current Aether library with ${safe.length} imported shortcuts. Export a backup first if needed.`,'Replace library',()=>{
    files.resetMigrationFailures();setDb({items:safe,preferences:migratePreferences(input.preferences)});message('Backup imported');
   },true);
  }catch{message('Could not import this backup')}finally{if(fileRef.current)fileRef.current.value=''}
 };
 const scanApps=async()=>{
  if(!isDesktop())return message('Installed-app discovery requires the Windows desktop build.');
  setScanning(true);
  try{
   const found=await native<{name:string;target:string;source:string}[]>('discover_installed_apps');
   const existing=new Set(db.items.map(x=>normalizeTarget(x.target)));const fresh=found.filter(x=>!existing.has(normalizeTarget(x.target)));
   if(!fresh.length)return message(`Scan complete. No new shortcuts (${found.length} detected).`);
   const counts=found.reduce((o,x)=>{o[x.source]=(o[x.source]||0)+1;return o},{} as Record<string,number>);
   ask('Add detected applications?',`Found ${found.length} apps (${Object.entries(counts).map(([k,v])=>`${v} ${k}`).join(', ')}); ${fresh.length} new. Existing entries remain untouched.`,'Add shortcuts',()=>{
    setDb(old=>({...old,items:[...old.items,...fresh.map(x=>({id:crypto.randomUUID(),name:x.name,target:x.target,category:guessCategory(x.name),favorite:false}))]}));message(`Added ${fresh.length} shortcuts`);
   });
  }catch(e){message(errorText(e,'Scan failed'))}finally{setScanning(false)}
 };
 const importLegacy=async(file?:File)=>{
  if(!file)return;
  try{
   const entries=parseLegacy(JSON.parse(await file.text()));const known=new Set(db.items.map(x=>normalizeTarget(x.target)));const fresh=entries.filter(x=>!known.has(normalizeTarget(x.target)));
   if(!fresh.length)return message('No new shortcuts found in this file.');
   ask('Import NexusBar shortcuts?',`Add ${fresh.length} shortcuts? ${entries.length-fresh.length} duplicates will be skipped. Your current library is preserved.`,'Import shortcuts',()=>{setDb(old=>({...old,items:[...old.items,...fresh]}));message(`Imported ${fresh.length} shortcuts`)});
  }catch(e){message(errorText(e,'Import failed'))}finally{if(legacyRef.current)legacyRef.current.value=''}
 };
 const exportTheme=()=>{downloadJson({format:'aether-theme-v1',name:'My Aether theme',preferences:{...prefs,motion:prefs.motionLevel!=='off',startWithWindows:false,wallpaper:''}},'aether-theme.json');message('Theme exported. Wallpaper is not included.')};
 const importTheme=async(file?:File)=>{
  if(!file)return;
  try{if(file.size>100000)throw Error('Theme file is too large');setPrefs(sanitizeTheme(JSON.parse(await file.text()),DEFAULT_PREFERENCES));message('Theme imported!')}
  catch(e){message(errorText(e))}
 };

 // ---- Context menus ----
 const menuActions:MenuActions={
  run:(item,verb)=>void run(item,verb),reveal,copyTarget:item=>void copyText(item.target).then(ok=>message(ok?'Copied to clipboard':'Could not copy')),
  toggleFavorite,setFavorites,edit:startAdd,quickPick,resetIcon,moveTo,resetStats,remove,removeMany,
 };
 const closeMenu=useEvent(()=>{
  const opener=menu?.opener;setMenu(null);
  const focusInMenu=!document.activeElement||document.activeElement===document.body||document.activeElement.closest?.('.ctx-menu');
  if(opener&&opener.isConnected&&focusInMenu)opener.focus({preventScroll:true});
 });
 const openCardMenu=useEvent((item:Item,x:number,y:number,opener:HTMLElement)=>{
  if(bulkMode){
   const ids=selectedIds.includes(item.id)?selectedIds:[...selectedIds,item.id];
   if(!selectedIds.includes(item.id))setSelectedIds(ids);
   setMenu({x,y,opener,entries:selectionMenu(menuActions,ids,db.items)});
  }else setMenu({x,y,opener,entries:itemMenu(menuActions,item)});
 });
 const openPaletteMenu=(item:Item,e:React.MouseEvent<HTMLElement>)=>{
  e.preventDefault();e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();const keyboard=e.clientX===0&&e.clientY===0;
  setMenu({x:keyboard?r.left+40:e.clientX,y:keyboard?r.bottom-6:e.clientY,opener:e.currentTarget,entries:wrapEntries(itemMenu(menuActions,item),()=>setPalette(false))});
 };

 // ---- Grid ----
 const reorder=useReorder({setDb,dbRef,page,motion,setPref,message});
 const canReorder=!bulkMode&&!query&&!deferredQuery&&page!=='Recent'&&page!=='Settings';
 const renderGrid=(items:Item[],reorderable=true)=>items.length
  ?<FlipGrid ids={items.map(x=>x.id)} motion={motion} className={'app-grid '+(prefs.layout==='list'?'list-layout':'')+' '+(prefs.compact?'compact':'')}>
   {items.map((item,index)=><Card key={item.id} item={item} index={index} iconSrc={glyphSrc(item)} artSrc={files.artSrcFor(item)} bulkMode={bulkMode} selected={bulkMode&&selectedIds.includes(item.id)} leaving={leaving.has(item.id)} motion={motion} reorderable={reorderable&&canReorder} dragging={reorder.draggingId===item.id} onDragStart={reorder.onDragStart} onNudge={reorder.onNudge} onActivate={run} onToggleSelect={toggleSelect} onFavorite={toggleFavorite} onEdit={startAdd} onRemove={remove} onMenu={openCardMenu}/>)}
  </FlipGrid>
  :<div className="empty"><div className="empty-visual"><Layers3 size={30}/></div><h3>Nothing here yet</h3><p>Add a shortcut to an app, folder, or website to start building your workspace.</p><button className="primary" onClick={()=>startAdd()}><Plus size={17}/> Add first shortcut</button></div>;

 // ---- Navigation ----
 const goPage=(label:string)=>{setPage(label);setCategory('All');setQuery('')};
 const goCategory=(c:string)=>{setCategory(c);if(page==='Home'||(c!=='All'&&page==='Settings'))setPage('Library')};
 const openQuickLauncher=()=>{setPalette(true);setPaletteQuery('')};

 // ---- Settings ----
 const osReducedMotion=motion==='off'&&prefs.motionLevel!=='off';
 const settingsApi:SettingsApi={
  prefs,defaults:DEFAULT_PREFERENCES,setPref,setPrefs,motion,osReducedMotion,
  wallpaperPreview:wallpaper.preview,selectWallpaper:()=>void wallpaper.select(),clearWallpaper:()=>void wallpaper.clear(),
  exportTheme,importTheme:()=>themeFileRef.current?.click(),
  exportBackup:()=>void exportData(),importBackup:()=>fileRef.current?.click(),importNexusBar:()=>legacyRef.current?.click(),
  scanApps:()=>void scanApps(),scanning,
  iconSummary:(isDesktop()?(iconCache.stats?`${iconCache.stats[0]} icons cached (${formatBytes(iconCache.stats[1])}). `:''):'Available in the desktop app. ')+(iconCache.caching?'Extracting icons now…':'Icons refresh automatically when a program updates.'),
  iconCaching:iconCache.caching,clearIconCache:()=>void iconCache.clear(),
  openQuickLauncher,libraryCount:db.items.length,
  resetAllSettings:()=>ask('Reset all settings?','Every setting returns to its default and the wallpaper is removed. Your shortcuts, icons and card images stay.','Reset settings',async()=>{
   if(prefs.wallpaper)await wallpaper.clear();
   setDb(old=>({...old,preferences:{...DEFAULT_PREFERENCES}}));message('All settings reset to defaults');
  },true),
  clearLibrary:()=>ask('Clear your whole library?',`This removes all ${db.items.length} shortcuts along with their custom icons and card images. Programs and files on your PC are not touched. If you might want them back, cancel and export a backup first.`,'Clear library',()=>{
   setDb(old=>({...old,items:[]}));setSelectedIds([]);setBulkMode(false);
   if(isDesktop())native('prune_card_art',{keep:[]}).catch(()=>{});
   message('Library cleared');
  },true),
  dataFolder,openDataFolder:()=>{native('open_app_data_folder').catch(e=>message(errorText(e,'Could not open the folder')))},
 };

 const shellStyle={'--accent':prefs.accent,'--sidebar-color':prefs.sidebarColor,'--panel-color':prefs.panelColor,'--card-color':prefs.cardColor,'--text-color':prefs.textColor,'--sidebar-width':`${prefs.sidebarWidth}px`,'--card-radius':`${prefs.radius}px`,'--ui-scale':prefs.scale/100,'--wallpaper-opacity':prefs.wallpaperOpacity/100,'--hero-opacity':prefs.heroOpacity/100,'--wallpaper-image':wallpaper.cssImage} as React.CSSProperties;

 return <div className="shell" style={shellStyle} data-sidebar-collapsed={prefs.sidebarCollapsed} data-density={prefs.density} data-motion={motion} data-boot={boot}>
  <Sidebar prefs={prefs} page={page} category={category} itemCount={db.items.length} favoriteCount={favorites.length} categoryCounts={categoryCounts} setPref={setPref} onPage={goPage} onCategory={goCategory} onSettings={()=>{setPage('Settings');setCategory('All')}}/>
  <main className="main">
   <Toolbar page={page} scanning={scanning} onQuickLaunch={openQuickLauncher} onScan={()=>void scanApps()} onAdd={()=>startAdd()}/>
   <div className="content page-view" key={page}>
    {page==='Home'?<HomePage greeting={prefs.greeting} itemCount={db.items.length} categoryTotal={Object.keys(categoryCounts).length} favorites={favorites} recent={recent} renderGrid={renderGrid} onAdd={()=>startAdd()} onPage={setPage}/>
    :page==='Settings'?<SettingsPage api={settingsApi}/>
    :<LibraryPage page={page} visible={visible} query={query} setQuery={setQuery} searchRef={searchRef} category={category} setCategory={setCategory} bulkMode={bulkMode} toggleBulk={()=>{setBulkMode(v=>!v);setSelectedIds([])}} selectedIds={selectedIds} setSelectedIds={setSelectedIds} moveTo={moveTo} setFavorites={setFavorites} removeMany={removeMany} renderGrid={renderGrid}/>}
   </div>
  </main>
  {toastPhase&&toastShown&&<Toast key={toastShown.id} phase={toastPhase} toast={toastShown} motion={motion} onDismiss={dismissToast}/>}
  {palettePhase&&<QuickLauncher phase={palettePhase} inputRef={paletteRef} query={paletteQuery} setQuery={setPaletteQuery} index={paletteIndex} setIndex={setPaletteIndex} items={paletteItems} glyphSrc={glyphSrc} onRun={item=>void run(item)} onClose={()=>setPalette(false)} onContextMenu={openPaletteMenu}/>}
  {confirmPhase&&confirmShown&&<ConfirmDialog phase={confirmPhase} box={confirmShown} onClose={()=>setConfirmBox(null)}/>}
  <input ref={cardFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e=>{void onCardFile(e.target.files?.[0]);e.target.value=''}}/>
  <input ref={iconFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e=>{void onIconFile(e.target.files?.[0]);e.target.value=''}}/>
  <input ref={themeFileRef} type="file" accept="application/json,.json" hidden onChange={e=>{void importTheme(e.target.files?.[0]);e.target.value=''}}/>
  <input ref={wallpaper.inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" hidden onChange={e=>{wallpaper.fromBrowserFile(e.target.files?.[0]);e.target.value=''}}/>
  <input ref={legacyRef} type="file" accept="application/json,.json" hidden onChange={e=>void importLegacy(e.target.files?.[0])}/>
  <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>void importData(e.target.files?.[0])}/>
  {modalPhase&&editor&&<ShortcutEditor key={editor.key} item={editor.item} phase={modalPhase} fileSrc={files.fileSrc} autoIcon={iconCache.iconSrcFor} prepareCardImage={prepareCardImage} readIconFile={readIconFile} browse={browseTarget} checkTarget={target=>native<boolean>('target_exists',{target})} readDroppedImage={readDroppedImage} message={message} onCancel={()=>setModal(false)} onSave={saveEditor}/>}
  {menuPhase&&menuShown&&<ContextMenu key={menuShown.x+':'+menuShown.y} x={menuShown.x} y={menuShown.y} entries={menuShown.entries} phase={menuPhase} onClose={closeMenu}/>}
  {splashMounted&&<Splash skipSignal={splashSkip} onArrive={()=>setBoot('arrive')} onDone={()=>setSplashMounted(false)}/>}
 </div>;
}
