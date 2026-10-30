/**
 * v0.15.2 global hotkey helpers (no Tauri calls, so they are unit-tested).
 * Accelerators use the format the Rust side parses: "Ctrl+Alt+Shift+Super+Key".
 */

export const DEFAULT_HOTKEY='Ctrl+Alt+Space';

const NAMED:Record<string,string>={
 Space:'Space',Enter:'Enter',Tab:'Tab',Backspace:'Backspace',Delete:'Delete',Insert:'Insert',
 Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown',
 ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',
 Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backquote:'`',
 PrintScreen:'PrintScreen',Pause:'Pause',
 NumpadAdd:'NumAdd',NumpadSubtract:'NumSubtract',NumpadMultiply:'NumMultiply',NumpadDivide:'NumDivide',NumpadDecimal:'NumDecimal',NumpadEnter:'NumEnter',
};

/** KeyboardEvent.code → accelerator key name, or null for modifiers and keys we don't support. */
export function keyName(code:string):string|null{
 if(/^Key[A-Z]$/.test(code))return code.slice(3);
 if(/^Digit\d$/.test(code))return code.slice(5);
 if(/^F([1-9]|1\d|2[0-4])$/.test(code))return code;
 if(/^Numpad\d$/.test(code))return 'Num'+code.slice(6);
 return NAMED[code]??null;
}

export type KeyInput={code:string;ctrlKey:boolean;altKey:boolean;shiftKey:boolean;metaKey:boolean};
export type RecordResult=
 |{kind:'partial';parts:string[]}
 |{kind:'invalid';parts:string[];reason:string}
 |{kind:'done';accelerator:string};

/** Combinations Windows keeps for itself; registering them would fail or break the system shortcut. */
const RESERVED=new Set(['Alt+Tab','Alt+F4','Alt+Space','Ctrl+Alt+Delete','Super+L','Super+D','Super+Tab','Ctrl+Shift+Escape','Ctrl+Escape']);

/** Turns one keydown into a finished accelerator, a still-being-held combination, or a reason it can't be used. */
export function recordKey(e:KeyInput):RecordResult{
 const mods:string[]=[];
 if(e.ctrlKey)mods.push('Ctrl');
 if(e.altKey)mods.push('Alt');
 if(e.shiftKey)mods.push('Shift');
 if(e.metaKey)mods.push('Super');
 const key=keyName(e.code);
 if(!key){
  if(/^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/.test(e.code))return {kind:'partial',parts:mods};
  return {kind:'invalid',parts:mods,reason:'That key can’t be used. Try a letter, number, F-key or Space.'};
 }
 const parts=[...mods,key];
 if(!e.ctrlKey&&!e.altKey&&!e.metaKey)return {kind:'invalid',parts,reason:'Hold Ctrl, Alt or Win as well, so it doesn’t fire while you type.'};
 const accelerator=parts.join('+');
 if(RESERVED.has(accelerator))return {kind:'invalid',parts,reason:'Windows uses that one. Pick another.'};
 return {kind:'done',accelerator};
}

/** "Ctrl+Alt+Space" → ["Ctrl","Alt","Space"], with Super shown as Win. */
export function hotkeyParts(accelerator:string):string[]{
 const tokens=accelerator.split('+');
 // A trailing "+" key would split into empty tokens; none of our keys use it, but stay safe.
 return tokens.filter(Boolean).map(t=>t==='Super'?'Win':t);
}

/** "Ctrl + Alt + Space" for sentences and footers. */
export const hotkeyLabel=(accelerator:string)=>hotkeyParts(accelerator).join(' + ');
