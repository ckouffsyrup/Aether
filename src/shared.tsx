import {useCallback, useLayoutEffect, useRef} from 'react';
import {version} from '../package.json';
import {Gamepad2, Code2, Music2, Globe, Folder, Terminal, AppWindow} from 'lucide-react';

/** Single source of truth: package.json (tauri.conf.json reads it too). */
export const APP_VERSION:string=version;

export type Category='Games'|'Development'|'Media'|'Browsers'|'Tools'|'Communication'|'Websites'|'Folders'|'Other';
export const categories:Category[]=['Games','Development','Media','Browsers','Tools','Communication','Websites','Folders','Other'];

/** cardArt / iconFile = file names in Aether's app-data card-art folder (desktop).
 *  icon = inline data URL for a custom icon (browser preview, legacy, or failed file save).
 *  cardImage = inline data URL (browser preview, legacy data, or failed file save). */
export type Item={id:string;name:string;target:string;category:Category;favorite:boolean;lastOpened?:number;icon?:string;iconFile?:string;cardImage?:string;cardArt?:string;cardImageX?:number;cardImageY?:number;launchCount?:number};

export type MotionLevel='off'|'subtle'|'full';
/** v0.15.2: app icons on grid cards. */
export type CardIcons='always'|'no-art'|'never';
export const CARD_ICONS:readonly CardIcons[]=['always','no-art','never'];

export type Preferences={accent:string;compact:boolean;greeting:boolean;startWithWindows:boolean;layout:'grid'|'list';density:'comfortable'|'compact'|'spacious';radius:number;scale:number;
 /** Legacy on/off flag, kept in sync for older versions reading the same data. */
 motion:boolean;motionLevel:MotionLevel;
 /** When Windows starts Aether at sign-in, stay in the tray instead of opening. */
 startHidden:boolean;
 /** v0.15: look for updates at launch and every few hours (installing always waits for the user). */
 autoUpdate:boolean;
 /** v0.15.2: hide the app icon on grid cards (always shown in list view). */
 cardIcons:CardIcons;
 wallpaper:string;wallpaperOpacity:number;sort:'name'|'recent'|'favorites'|'most-used'|'custom';sidebarColor:string;panelColor:string;cardColor:string;textColor:string;sidebarWidth:number;sidebarCollapsed:boolean;categoriesMode:'show'|'collapse'|'hide';heroOpacity:number;};


export const isDesktop=()=>'__TAURI_INTERNALS__' in window;

export function categoryIcon(category:Category){switch(category){case 'Games':return <Gamepad2/>;case 'Development':return <Code2/>;case 'Media':return <Music2/>;case 'Browsers':case 'Websites':return <Globe/>;case 'Folders':return <Folder/>;case 'Tools':return <Terminal/>;default:return <AppWindow/>}}

export type TargetKind='url'|'app-id'|'program'|'folder'|'file';
export function targetKind(item:Pick<Item,'target'|'category'>):TargetKind{
 const t=item.target.trim();
 if(/^https?:\/\//i.test(t))return 'url';
 if(/^shell:/i.test(t))return 'app-id';
 if(/\.(exe|lnk|bat|cmd|com|msc)$/i.test(t))return 'program';
 if(item.category==='Folders'||!/\.[a-z0-9]{1,6}$/i.test(t))return 'folder';
 return 'file';
}

/** Stable function identity that always calls the latest implementation.
 *  Lets memoized cards keep the same callbacks between renders. */
export function useEvent<A extends unknown[],R>(fn:(...args:A)=>R):(...args:A)=>R{
 const ref=useRef(fn);
 useLayoutEffect(()=>{ref.current=fn});
 return useCallback((...args:A)=>ref.current(...args),[]);
}

export async function copyText(text:string){
 try{await navigator.clipboard.writeText(text);return true}catch{
  try{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok}catch{return false}
 }
}

