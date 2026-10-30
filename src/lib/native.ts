import {invoke} from '@tauri-apps/api/core';
import {isDesktop} from '../shared';

/** Call a Rust command (src-tauri/src). */
export const native=<T,>(cmd:string,args?:Record<string,unknown>)=>invoke<T>(cmd,args);

/** Rust commands reject with plain strings; JS throws Errors. Normalize both. */
export const errorText=(e:unknown,fallback='Something went wrong')=>typeof e==='string'?e:e instanceof Error?e.message:fallback;

export async function launch(target:string,verb:'open'|'runas'='open'){
 if(isDesktop())await native('launch_target',{target,verb});
 else if(/^https?:\/\//i.test(target))window.open(target,'_blank','noopener,noreferrer');
 else throw new Error('Local shortcuts require the Windows desktop build.');
}

export const joinPath=(dir:string,file:string)=>dir+(dir.includes('\\')?'\\':'/')+file;
