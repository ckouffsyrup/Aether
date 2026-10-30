/** Helpers for the v0.15 updater UI (no Tauri calls here, so they are unit-tested). */

export const RELEASES_URL='https://github.com/ckouffsyrup/Aether/releases';

export type NoteLine={text:string;bullet:boolean};

/**
 * Turns release notes (the changelog section published with the release) into
 * plain lines: drops headings, Markdown emphasis and the internal entry numbers.
 */
export function releaseNoteLines(body:string|undefined,limit=12):NoteLine[]{
 if(!body)return [];
 const lines:NoteLine[]=[];
 for(const raw of body.split(/\r?\n/)){
  let text=raw.trim();
  if(!text||text.startsWith('#'))continue;
  const bullet=/^[-*]\s+/.test(text);
  if(bullet)text=text.replace(/^[-*]\s+/,'');
  text=text.replace(/\*\*|__|`/g,'').replace(/^\d{2,4}\s+—\s+/,'').trim();
  if(text)lines.push({text,bullet});
 }
 if(lines.length>limit)return [...lines.slice(0,limit),{text:`…and ${lines.length-limit} more`,bullet:false}];
 return lines;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(then:number,now=Date.now()):string{
 const min=Math.floor(Math.max(0,now-then)/60000);
 if(min<1)return 'just now';
 if(min<60)return `${min} min ago`;
 const h=Math.floor(min/60);
 if(h<24)return `${h} h ago`;
 const d=Math.floor(h/24);
 return d===1?'1 day ago':`${d} days ago`;
}

/** Compares x.y.z versions; a missing part counts as 0. */
export function compareVersions(a:string,b:string):number{
 const pa=a.replace(/^v/,'').split(/[.-]/).map(n=>parseInt(n,10)||0);
 const pb=b.replace(/^v/,'').split(/[.-]/).map(n=>parseInt(n,10)||0);
 for(let i=0;i<3;i++){const d=(pa[i]??0)-(pb[i]??0);if(d)return Math.sign(d)}
 return 0;
}
