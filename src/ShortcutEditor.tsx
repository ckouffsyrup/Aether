import React, {useEffect, useRef, useState} from 'react';
import {AlertTriangle, ArrowUpRight, Check, Crosshair, FileImage, FileSearch, Folder, ImagePlus, Star, X} from 'lucide-react';
import {categories, categoryIcon, isDesktop, targetKind, type Category, type Item, type TargetKind} from './shared';

export type EditorValues={name:string;target:string;category:Category;favorite:boolean;icon:{file?:string;data?:string};art:{file?:string;data?:string};cardImageX:number;cardImageY:number};

type Props={
 item?:Item;
 phase:'in'|'out';
 /** asset:// URL for an existing card-art file */
 fileSrc:(file:string)=>string;
 /** Automatically extracted Windows icon for a target, if cached */
 autoIcon:(target:string)=>string|undefined;
 prepareCardImage:(file:File)=>Promise<string>;
 readIconFile:(file:File)=>Promise<string>;
 browse:(folder:boolean)=>Promise<string|null>;
 checkTarget:(target:string)=>Promise<boolean|null>;
 readDroppedImage:(path:string)=>Promise<File>;
 message:(text:string)=>void;
 onCancel:()=>void;
 onSave:(values:EditorValues)=>Promise<void>;
};

const KIND_LABEL:Record<TargetKind,string>={url:'Website','app-id':'Windows app',program:'Program',folder:'Folder',file:'File'};
const IMAGE_EXT=/\.(png|jpe?g|webp|gif|bmp)$/i;
const clamp=(v:number)=>Math.max(0,Math.min(100,v));

/** v0.11 shortcut editor: pinned header/footer, live card preview with drag-to-frame. */
export function ShortcutEditor({item,phase,fileSrc,autoIcon,prepareCardImage,readIconFile,browse,checkTarget,readDroppedImage,message,onCancel,onSave}:Props){
 const [name,setName]=useState(item?.name??'');
 const [target,setTarget]=useState(item?.target??'');
 const [category,setCategory]=useState<Category>(item?.category??'Other');
 const [favorite,setFavorite]=useState(item?.favorite??false);
 const [icon,setIcon]=useState<{file?:string;data?:string}>(item?.iconFile?{file:item.iconFile}:item?.icon?{data:item.icon}:{});
 const [art,setArt]=useState<{file?:string;data?:string}>(item?.cardArt?{file:item.cardArt}:item?.cardImage?{data:item.cardImage}:{});
 const [pos,setPos]=useState({x:item?.cardImageX??50,y:item?.cardImageY??50});
 const [saving,setSaving]=useState(false);
 const [nameError,setNameError]=useState('');
 const [targetError,setTargetError]=useState('');
 const [exists,setExists]=useState<boolean|null>(null);
 const [dropping,setDropping]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [preparing,setPreparing]=useState(false);
 const iconInput=useRef<HTMLInputElement>(null);
 const artInput=useRef<HTMLInputElement>(null);
 const previewRef=useRef<HTMLDivElement>(null);
 const nameRef=useRef<HTMLInputElement>(null);
 const natural=useRef<{w:number;h:number}|null>(null);
 const drag=useRef<{x:number;y:number;px:number;py:number;id:number}|null>(null);

 const artSrc=art.data??(art.file?fileSrc(art.file):'');
 const kind=targetKind({target,category});
 const customIcon=icon.data??(icon.file?fileSrc(icon.file):'');
 const glyph=customIcon||autoIcon(target.trim());
 const trimmed=target.trim();

 useEffect(()=>{const t=window.setTimeout(()=>nameRef.current?.focus(),30);return()=>clearTimeout(t)},[]);

 // Natural image size, used to convert drag distance into background-position %.
 useEffect(()=>{
  natural.current=null;if(!artSrc)return;
  const img=new Image();img.onload=()=>{natural.current={w:img.naturalWidth,h:img.naturalHeight}};img.src=artSrc;
 },[artSrc]);

 // Live "does this target exist?" check (desktop, local paths only), debounced.
 useEffect(()=>{
  setExists(null);
  if(!trimmed||kind==='url'||kind==='app-id'||!isDesktop())return;
  let cancelled=false;
  const t=window.setTimeout(()=>{checkTarget(trimmed).then(v=>{if(!cancelled)setExists(v)}).catch(()=>{})},300);
  return()=>{cancelled=true;clearTimeout(t)};
 },[trimmed,kind]);

 const applyArtFile=async(file:File)=>{
  setPreparing(true);
  try{setArt({data:await prepareCardImage(file)});setPos({x:50,y:50})}
  catch(e){message(e instanceof Error?e.message:String(e))}
  finally{setPreparing(false)}
 };

 // Native file drops (desktop). WebView2 doesn't hand dropped files to the page,
 // so Tauri reports the paths and Rust reads the image.
 useEffect(()=>{
  if(!isDesktop())return;
  let unlisten:(()=>void)|undefined;let alive=true;
  import('@tauri-apps/api/webview').then(({getCurrentWebview})=>getCurrentWebview().onDragDropEvent(async event=>{
   const p=event.payload;
   if(p.type==='enter')setDropping(p.paths.some(x=>IMAGE_EXT.test(x)));
   else if(p.type==='leave')setDropping(false);
   else if(p.type==='drop'){
    setDropping(false);
    const path=p.paths.find(x=>IMAGE_EXT.test(x));
    if(!path){if(p.paths.length)message('Drop a PNG, JPG, WebP, GIF or BMP image to use it as card art.');return}
    try{await applyArtFile(await readDroppedImage(path))}catch(e){message(typeof e==='string'?e:e instanceof Error?e.message:'Could not read that image')}
   }
  })).then(fn=>{if(alive)unlisten=fn;else fn()}).catch(()=>{});
  return()=>{alive=false;unlisten?.()};
 },[]);

 const save=async()=>{
  if(saving||preparing)return;
  let bad=false;
  if(!name.trim()){setNameError('Give this shortcut a name.');bad=true}
  if(!trimmed){setTargetError('Choose a program, folder, or website.');bad=true}
  else if(/^https?:/i.test(trimmed)&&!/^https?:\/\/.+/i.test(trimmed)){setTargetError('Use a complete http(s) URL.');bad=true}
  if(bad)return;
  setSaving(true);
  try{await onSave({name:name.trim(),target:trimmed,category,favorite,icon,art,cardImageX:Math.round(pos.x),cardImageY:Math.round(pos.y)})}
  finally{setSaving(false)}
 };

 // ---- Drag to frame ----
 const onPointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(!artSrc||e.button!==0)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y,id:e.pointerId};setDragging(true);
 };
 const onPointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  const d=drag.current;const box=previewRef.current?.getBoundingClientRect();const n=natural.current;
  if(!d||!box||!n)return;
  // background-size: cover -> the overflowing axis is what can be panned.
  const scale=Math.max(box.width/n.w,box.height/n.h);
  const overX=n.w*scale-box.width,overY=n.h*scale-box.height;
  // Dragging the picture right reveals its left side, so the position decreases.
  setPos({x:overX>1?clamp(d.px-(e.clientX-d.x)/overX*100):50,y:overY>1?clamp(d.py-(e.clientY-d.y)/overY*100):50});
 };
 const endDrag=(e:React.PointerEvent<HTMLDivElement>)=>{if(drag.current?.id===e.pointerId){drag.current=null;setDragging(false)}};
 const onPreviewKey=(e:React.KeyboardEvent)=>{
  if(!artSrc)return;
  const step=e.shiftKey?10:2;
  const d={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  if(d){e.preventDefault();setPos(p=>({x:clamp(p.x+d[0]),y:clamp(p.y+d[1])}))}
 };

 const previewStyle:React.CSSProperties&Record<string,string>={};
 if(artSrc){previewStyle['--card-image']=`url("${artSrc}")`;previewStyle['--card-position']=`${pos.x}% ${pos.y}%`}

 return <div className={'scrim editor-scrim phase-'+phase} onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}>
  <div className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title"
   onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save()}}}
   onDragOver={e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();setDropping(true)}}}
   onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDropping(false)}}
   onDrop={e=>{e.preventDefault();setDropping(false);const f=e.dataTransfer.files?.[0];if(f)void applyArtFile(f)}}>
   <header className="editor-head">
    <div><span className="section-kicker">YOUR LIBRARY</span><h2 id="editor-title">{item?'Edit shortcut':'Add a shortcut'}</h2></div>
    <button className="icon-button" aria-label="Close" onClick={onCancel}><X size={20}/></button>
   </header>

   <div className="editor-body">
    <aside className="editor-visual">
     <div ref={previewRef} tabIndex={artSrc?0:-1} aria-label={artSrc?'Card preview. Drag or use arrow keys to frame the picture.':'Card preview'}
      className={'app-card preview-card'+(artSrc?' has-card-image':'')+(dragging?' is-dragging':'')+(dropping?' is-drop-target':'')}
      style={previewStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onPreviewKey}>
      <div className="card-top"><span className="app-glyph">{glyph?<img className="native-icon" src={glyph} alt="" draggable={false}/>:categoryIcon(category)}</span><span className={'icon-button fave '+(favorite?'active':'')}><Star size={17} fill={favorite?'currentColor':'none'}/></span></div>
      <div className="app-title">{name.trim()||'Untitled shortcut'}</div>
      <div className="app-category">{category}</div>
      <div className="card-bottom"><span className="launch">Open <ArrowUpRight size={15}/></span></div>
      {dropping&&<div className="drop-veil"><ImagePlus size={26}/><b>Drop to use as card art</b></div>}
      {preparing&&<div className="drop-veil"><b>Optimizing image…</b></div>}
     </div>
     <div className="preview-caption">
      {artSrc?<><span>Drag the picture to frame it</span><button className="chip-button" onClick={()=>setPos({x:50,y:50})} disabled={pos.x===50&&pos.y===50}><Crosshair size={13}/> Center</button></>:<span>Live preview</span>}
     </div>

     <div className="asset-row">
      <div className="asset-thumb">{glyph?<img src={glyph} alt=""/>:categoryIcon(category)}</div>
      <div className="asset-text"><b>Icon</b><span>{customIcon?'Custom image':glyph?'Automatic from Windows':'Category symbol'}</span></div>
      <div className="asset-actions"><button className="chip-button" onClick={()=>iconInput.current?.click()}>Change</button>{customIcon&&<button className="chip-button" onClick={()=>setIcon({})}>Auto</button>}</div>
     </div>
     <div className={'asset-row drop-row'+(dropping?' is-drop-target':'')}>
      <div className="asset-thumb wide">{artSrc?<img src={artSrc} alt="" style={{objectPosition:`${pos.x}% ${pos.y}%`}}/>:<FileImage size={18}/>}</div>
      <div className="asset-text"><b>Card art</b><span>{artSrc?'Optimized copy':'Drop or choose an image'}</span></div>
      <div className="asset-actions"><button className="chip-button" onClick={()=>artInput.current?.click()}>{artSrc?'Replace':'Choose'}</button>{artSrc&&<button className="chip-button" onClick={()=>{setArt({});setPos({x:50,y:50})}}>Remove</button>}</div>
     </div>
    </aside>

    <section className="editor-fields">
     <label className="ed-field">
      <span className="ed-label">Name</span>
      <input ref={nameRef} maxLength={200} value={name} placeholder="e.g. Visual Studio Code" className={nameError?'has-error':''} onChange={e=>{setName(e.target.value);setNameError('')}} onKeyDown={e=>{if(e.key==='Enter')void save()}}/>
      {nameError&&<small className="ed-error">{nameError}</small>}
     </label>

     <div className="ed-field">
      <span className="ed-label">Target {trimmed&&<span className={'kind-badge kind-'+kind}>{KIND_LABEL[kind]}</span>}</span>
      <div className={'target-input'+(targetError?' has-error':'')}>
       <input value={target} spellCheck={false} title={target} placeholder="C:\Apps\app.exe or https://example.com" onChange={e=>{setTarget(e.target.value);setTargetError('')}}/>
       <button className="icon-button" title="Browse for a program" onClick={async()=>{const p=await browse(false);if(p){setTarget(p);setTargetError('')}}}><FileSearch size={16}/></button>
       <button className="icon-button" title="Browse for a folder" onClick={async()=>{const p=await browse(true);if(p){setTarget(p);setTargetError('');setCategory(c=>c==='Other'?'Folders':c)}}}><Folder size={16}/></button>
      </div>
      {targetError?<small className="ed-error">{targetError}</small>:exists===false?<small className="ed-warn"><AlertTriangle size={13}/> Not found on this PC. It won't launch until the path is fixed.</small>:<small className="ed-help">Program, shortcut, folder, or a full website URL.</small>}
     </div>

     <div className="ed-field">
      <span className="ed-label">Category</span>
      <div className="chip-grid" role="radiogroup" aria-label="Category">
       {categories.map(c=><button key={c} role="radio" aria-checked={category===c} className={'cat-chip'+(category===c?' is-on':'')} onClick={()=>setCategory(c)}>{categoryIcon(c)}<span>{c}</span></button>)}
      </div>
     </div>
    </section>
   </div>

   <footer className="editor-foot">
    <button className={'fav-toggle'+(favorite?' is-on':'')} aria-pressed={favorite} onClick={()=>setFavorite(v=>!v)}><Star size={16} fill={favorite?'currentColor':'none'}/>{favorite?'Favorite':'Add to favorites'}</button>
    <span className="foot-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> to save</span>
    <button className="secondary" onClick={onCancel}>Cancel</button>
    <button className="primary" disabled={saving||preparing} onClick={()=>void save()}><Check size={17}/>{saving?'Saving…':item?'Save changes':'Add shortcut'}</button>
   </footer>

   <input ref={iconInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{setIcon({data:await readIconFile(f)})}catch(err){message(err instanceof Error?err.message:String(err))}}}/>
   <input ref={artInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void applyArtFile(f)}}/>
  </div>
 </div>;
}
