import {categories, type Category, type Item, type MotionLevel, type Preferences} from '../shared';

/** Library + settings as stored in the webview. */
export type Database={items:Item[];preferences:Preferences};

export const STORAGE_KEY='veyl.aether.v01'; // kept since v0.1 so old data still loads
export const PAGE_KEY='veyl.aether.page';
/** v0.4–v0.12 kept icons in localStorage; v0.13 moved them to files. Removed on start. */
export const LEGACY_ICON_CACHE_KEY='veyl.aether.iconcache.v1';
export const MOTION_LEVELS:MotionLevel[]=['off','subtle','full'];
/** File names Aether generates for card art / custom icons. */
export const CARD_FILE=/^[A-Za-z0-9.-]{1,120}$/;

export const DEFAULT_PREFERENCES:Preferences={accent:'#916cff',compact:false,greeting:true,startWithWindows:false,layout:'grid',density:'comfortable',radius:14,scale:100,motion:true,motionLevel:'full',startHidden:true,wallpaper:'',wallpaperOpacity:20,sort:'name',sidebarColor:'#11101b',panelColor:'#151520',cardColor:'#151520',textColor:'#f2efff',sidebarWidth:254,sidebarCollapsed:false,categoriesMode:'show',heroOpacity:35};
export const DEFAULT_DATABASE:Database={items:[],preferences:DEFAULT_PREFERENCES};

/** Merge stored preferences over the defaults, migrating older formats. */
export function migratePreferences(stored:unknown):Preferences{
 const raw=stored&&typeof stored==='object'?stored as Record<string,unknown>:{};
 const preferences:Preferences={...DEFAULT_PREFERENCES,...raw} as Preferences;
 // v0.10: on/off motion became Off / Subtle / Full.
 if(!MOTION_LEVELS.includes(raw.motionLevel as MotionLevel))preferences.motionLevel=raw.motion===false?'off':'full';
 return preferences;
}

/** Parse the stored JSON. Invalid or missing data falls back to an empty library. */
export function parseDatabase(json:string|null):Database{
 try{
  if(!json)return DEFAULT_DATABASE;
  const data=JSON.parse(json);if(!Array.isArray(data?.items))return DEFAULT_DATABASE;
  return {
   items:data.items.filter((x:any)=>typeof x?.id==='string'&&typeof x?.name==='string'&&typeof x?.target==='string').map((x:any)=>({
    ...x,
    category:categories.includes(x.category)?x.category:'Other',
    cardArt:typeof x.cardArt==='string'&&CARD_FILE.test(x.cardArt)?x.cardArt:undefined,
    iconFile:typeof x.iconFile==='string'&&CARD_FILE.test(x.iconFile)?x.iconFile:undefined,
   })),
   preferences:migratePreferences(data.preferences),
  };
 }catch{return DEFAULT_DATABASE}
}

export function serializeDatabase(db:Database):string{
 // Keep the legacy on/off flag in sync for older versions reading the same data.
 return JSON.stringify({...db,preferences:{...db.preferences,motion:db.preferences.motionLevel!=='off'}});
}

export const readDatabase=()=>{try{return parseDatabase(localStorage.getItem(STORAGE_KEY))}catch{return DEFAULT_DATABASE}};
/** Never let a failed save (quota exceeded) crash the UI. */
export function writeDatabase(db:Database):boolean{try{localStorage.setItem(STORAGE_KEY,serializeDatabase(db));return true}catch{return false}}

const clampPct=(v:unknown)=>typeof v==='number'?Math.max(0,Math.min(100,v)):50;
/** Validate items from an Aether backup file. New ids; only image data URLs are kept. */
export function sanitizeBackupItems(input:unknown,newId:()=>string=()=>crypto.randomUUID()):Item[]{
 if(!Array.isArray(input))throw Error('Invalid backup');
 return input.filter((x:any)=>typeof x?.name==='string'&&typeof x?.target==='string').slice(0,5000).map((x:any)=>({
  id:newId(),name:x.name.slice(0,200),target:x.target.slice(0,3000),
  category:(categories.includes(x.category)?x.category:'Other') as Category,
  favorite:!!x.favorite,
  lastOpened:typeof x.lastOpened==='number'?x.lastOpened:undefined,
  launchCount:Math.max(0,Number(x.launchCount)||0),
  icon:typeof x.icon==='string'&&x.icon.startsWith('data:image/')?x.icon:undefined,
  cardImage:typeof x.cardImage==='string'&&x.cardImage.startsWith('data:image/')?x.cardImage:undefined,
  cardImageX:clampPct(x.cardImageX),cardImageY:clampPct(x.cardImageY),
 }));
}
