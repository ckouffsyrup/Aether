import {Plus, ScanSearch, Search} from 'lucide-react';

export function Toolbar({page,scanning,onQuickLaunch,onScan,onAdd}:{page:string;scanning:boolean;onQuickLaunch:()=>void;onScan:()=>void;onAdd:()=>void}){
 return <header className="toolbar">
  <div className="breadcrumbs">Workspace <span>/</span> <b>{page}</b></div>
  <div className="toolbar-right">
   <button className="shortcut" onClick={onQuickLaunch}><Search size={16}/> Quick launch <kbd>Ctrl K</kbd></button>
   <button className="secondary scan-button" onClick={onScan} disabled={scanning}><ScanSearch size={17}/>{scanning?'Scanning…':'Detect apps'}</button>
   <button className="primary small" onClick={onAdd}><Plus size={17}/> Add shortcut</button>
  </div>
 </header>;
}
