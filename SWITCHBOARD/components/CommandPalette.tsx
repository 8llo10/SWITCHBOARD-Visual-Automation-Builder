'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Activity,ArrowRight,Command,Compass,CornerDownLeft,KeyRound,LayoutDashboard,Loader2,Search,Settings,ShieldCheck,Users,Workflow,X,Zap} from 'lucide-react';
import {getSession,sb} from '../lib/switchboard';
import './command-palette.css';

type WorkflowResult={id:string;name:string;description?:string|null;status:string};
type Action={href:string;label:string;description:string;icon:typeof Workflow;roles:string[]};
const pages:Action[]=[
 {href:'/dashboard',label:'Overview',description:'Automation performance',icon:LayoutDashboard,roles:['ADMIN','OPERATOR','VIEWER']},
 {href:'/workflows',label:'Workflows',description:'All your automations',icon:Workflow,roles:['ADMIN','OPERATOR','VIEWER']},
 {href:'/runs',label:'Executions',description:'Run status and logs',icon:Activity,roles:['ADMIN','OPERATOR','VIEWER']},
 {href:'/triggers',label:'Triggers',description:'Schedules and webhooks',icon:Zap,roles:['ADMIN','OPERATOR','VIEWER']},
 {href:'/credentials',label:'Credentials',description:'Secure integrations',icon:KeyRound,roles:['ADMIN','OPERATOR']},
 {href:'/directory',label:'Directory',description:'Managed users and groups',icon:Users,roles:['ADMIN','OPERATOR']},
 {href:'/audit',label:'Audit trail',description:'Change history',icon:ShieldCheck,roles:['ADMIN']},
 {href:'/users',label:'Team & roles',description:'Access management',icon:Users,roles:['ADMIN']},
 {href:'/settings',label:'System status',description:'Service health',icon:Settings,roles:['ADMIN','OPERATOR','VIEWER']}
];

export function CommandPalette(){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [workflows,setWorkflows]=useState<WorkflowResult[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState(0);
 const searchRef=useRef<HTMLInputElement>(null);
 const role=String((getSession()?.user as {role?:string}|null)?.role||'VIEWER');
 const available=useMemo(()=>pages.filter(p=>p.roles.includes(role)),[role]);
 const matchingPages=useMemo(()=>available.filter(p=>(p.label+' '+p.description).toLowerCase().includes(query.toLowerCase())),[available,query]);
 const matchingFlows=useMemo(()=>workflows.filter(w=>(w.name+' '+(w.description||'')).toLowerCase().includes(query.toLowerCase())).slice(0,8),[workflows,query]);
 const choices=useMemo(()=>[...matchingPages.map(p=>p.href),...matchingFlows.map(w=>'/workflows/'+w.id)], [matchingPages,matchingFlows]);
 const close=useCallback(()=>{setOpen(false);setQuery('');setSelected(0)},[]);
 const go=useCallback((href:string)=>{close();router.push(href)},[close,router]);
 useEffect(()=>{
  const down=(event:KeyboardEvent)=>{
   const element=event.target as HTMLElement|null;
   const typing=element?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element?.tagName||'');
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setOpen(o=>!o)}
   else if(!typing&&event.key==='/'&&!event.metaKey&&!event.ctrlKey){event.preventDefault();setOpen(true)}
  };
  const show=()=>setOpen(true);
  window.addEventListener('keydown',down);
  window.addEventListener('switchboard:command',show);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('switchboard:command',show)};
 },[]);
 useEffect(()=>{
  if(!open)return;
  searchRef.current?.focus();
  let alive=true;
  setLoading(true);
  setError('');
  sb<WorkflowResult[]>('/workflows').then(w=>{if(alive)setWorkflows(Array.isArray(w)?w:[])}).catch(()=>{if(alive)setError('Workflows could not be loaded. You can still navigate between pages.')}).finally(()=>{if(alive)setLoading(false)});
  const prev=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{alive=false;document.body.style.overflow=prev};
 },[open]);
 useEffect(()=>setSelected(0),[query]);
 const onKey=(e:React.KeyboardEvent<HTMLInputElement>)=>{
  if(e.key==='Escape'){e.preventDefault();close()}
  if(e.key==='ArrowDown'){e.preventDefault();setSelected(i=>(i+1)%Math.max(choices.length,1))}
  if(e.key==='ArrowUp'){e.preventDefault();setSelected(i=>(i-1+Math.max(choices.length,1))%Math.max(choices.length,1))}
  if(e.key==='Enter'&&choices.length){e.preventDefault();go(choices[Math.min(selected,choices.length-1)])}
 };
 return <>{open&&<div className="sb-cmd-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="sb-cmd-dialog" role="dialog" aria-modal="true" aria-label="Search and navigate Switchboard">
   <div className="sb-cmd-search"><Search size={21}/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={onKey} placeholder="Search pages, workflows, actions..." aria-label="Search Switchboard"/><button type="button" onClick={close} aria-label="Close search"><X size={18}/></button></div>
   <div className="sb-cmd-scroll">
    {matchingPages.length>0&&<section><div className="sb-cmd-section-label">NAVIGATE</div>{matchingPages.map((p,i)=><button key={p.href} type="button" className={'sb-cmd-option '+(selected===i?'selected':'')} onMouseEnter={()=>setSelected(i)} onClick={()=>go(p.href)}><span className="sb-cmd-option-icon"><p.icon size={19}/></span><span><b>{p.label}</b><small>{p.description}</small></span><ArrowRight size={16}/></button>)}</section>}
    {matchingFlows.length>0&&<section><div className="sb-cmd-section-label">WORKFLOWS</div>{matchingFlows.map((w,i)=><button key={w.id} type="button" className={'sb-cmd-option '+(selected===matchingPages.length+i?'selected':'')} onMouseEnter={()=>setSelected(matchingPages.length+i)} onClick={()=>go('/workflows/'+w.id)}><span className="sb-cmd-option-icon purple"><Workflow size={19}/></span><span><b>{w.name}</b><small>{w.description||'Open visual editor'}</small></span><span className="sb-cmd-status">{w.status}</span></button>)}</section>}
    {loading&&<div className="sb-cmd-note"><Loader2 size={16} className="sb-cmd-spin"/> Loading workflows…</div>}
    {error&&<div className="sb-cmd-note" role="status">{error}</div>}
    {!loading&&!choices.length&&<div className="sb-cmd-empty"><Compass size={30}/><b>No matches</b><span>Try a different name or keyword.</span></div>}
   </div>
   <footer className="sb-cmd-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>Esc</kbd> to close</span></footer>
  </section>
 </div>}</>;
}
