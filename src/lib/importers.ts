import {categories, type Category, type Item, type MotionLevel, type Preferences} from '../shared';
import {MOTION_LEVELS} from './storage';

export function guessCategory(name:string):Category{
 const value=name.toLowerCase();
 if(/steam|epic|game|minecraft|roblox|valorant|riot|battle/.test(value))return 'Games';
 if(/code|visual studio|python|github|git|terminal|intellij|godot|unity/.test(value))return 'Development';
 if(/spotify|vlc|music|obs|audacity|media|photo/.test(value))return 'Media';
 if(/chrome|firefox|edge|brave|opera/.test(value))return 'Browsers';
 if(/discord|slack|telegram|zoom|teams/.test(value))return 'Communication';
 return 'Other';
}

/** Compare targets ignoring case and slash direction (duplicate detection). */
export const normalizeTarget=(path:string)=>path.trim().replace(/\\/g,'/').toLowerCase();

/** NexusBar exports: an array, `{apps:[…]}` or `{items:[…]}` with name/title and target/path/url. */
export function parseLegacy(data:any,newId:()=>string=()=>crypto.randomUUID()):Item[]{
 const source=Array.isArray(data)?data:Array.isArray(data?.apps)?data.apps:Array.isArray(data?.items)?data.items:null;
 if(!source)throw Error('This file does not contain a supported apps or items array.');
 return source.filter((x:any)=>x&&typeof x==='object').map((x:any)=>{
  const name=String(x.name??x.title??'').trim();const target=String(x.target??x.path??x.url??'').trim();
  if(!name||!target)return null;
  const rawCategory=String(x.category??'');
  const category=categories.includes(rawCategory as Category)?rawCategory as Category:guessCategory(name);
  return {id:newId(),name:name.slice(0,200),target:target.slice(0,3000),category,favorite:Boolean(x.favorite??x.is_favorite??x.pinned),lastOpened:undefined} as Item;
 }).filter((x:Item|null):x is Item=>x!==null).slice(0,5000);
}

/** Validate an imported theme file. Only appearance keys are accepted. */
export function sanitizeTheme(data:any,defaults:Preferences):Partial<Preferences>{
 if(data?.format!=='aether-theme-v1'||!data.preferences||typeof data.preferences!=='object')throw Error('Not an Aether theme');
 const p=data.preferences;
 const hex=(v:any,f:string)=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v:f;
 const clamp=(v:any,min:number,max:number,f:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
 const motionLevel:MotionLevel=MOTION_LEVELS.includes(p.motionLevel)?p.motionLevel:p.motion===false?'off':'full';
 return {
  accent:hex(p.accent,defaults.accent),sidebarColor:hex(p.sidebarColor,defaults.sidebarColor),panelColor:hex(p.panelColor,defaults.panelColor),cardColor:hex(p.cardColor,defaults.cardColor),textColor:hex(p.textColor,defaults.textColor),
  sidebarWidth:clamp(p.sidebarWidth,190,340,254),radius:clamp(p.radius,2,32,14),scale:clamp(p.scale,85,120,100),wallpaperOpacity:clamp(p.wallpaperOpacity,0,70,20),
  density:['compact','comfortable','spacious'].includes(p.density)?p.density:'comfortable',layout:p.layout==='list'?'list':'grid',
  motionLevel,motion:motionLevel!=='off',compact:!!p.compact,sidebarCollapsed:!!p.sidebarCollapsed,
  categoriesMode:['show','collapse','hide'].includes(p.categoriesMode)?p.categoriesMode:'show',heroOpacity:clamp(p.heroOpacity,0,95,35),
 };
}
