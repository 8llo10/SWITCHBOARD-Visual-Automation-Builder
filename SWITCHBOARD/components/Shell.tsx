'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,Database,LogOut,Network,Play,ScrollText,Settings,ShieldCheck,Users,Workflow,Zap,KeyRound} from 'lucide-react';
import {clearSession,getSession} from '../lib/switchboard';

const sections=[
  {href:'/dashboard',label:'OVERVIEW',icon:Activity},
  {href:'/workflows',label:'WORKFLOWS',icon:Workflow},
  {href:'/runs',label:'RUNS',icon:Play},
  {href:'/triggers',label:'TRIGGERS',icon:Zap},
  {href:'/credentials',label:'SECRETS',icon:KeyRound},
  {href:'/directory',label:'DIRECTORY',icon:Users},
  {href:'/audit',label:'AUDIT',icon:ScrollText},
  {href:'/users',label:'USERS',icon:ShieldCheck},
  {href:'/settings',label:'SYSTEM',icon:Settings},
];

export function Shell({children,title,eyebrow,actions}:{children:React.ReactNode;title:string;eyebrow?:string;actions?:React.ReactNode}){
  const path=usePathname(),router=useRouter();const[session,setSessionState]=useState<any>(undefined),[open,setOpen]=useState(false);
  useEffect(()=>{const current=getSession() as any;if(!current?.token){router.replace('/login');return}setSessionState(current)},[router]);
  if(session===undefined)return <div className="auth-page"><div className="auth-card"><p className="eyebrow">SWITCHBOARD</p><h2>Checking session…</h2></div></div>;
  const logout=()=>{clearSession();router.replace('/login')};
  return <div className="app-shell"><header className="workspace-header"><div className="cp-brand"><Network size={16}/><span>SWITCHBOARD</span><i>CONTROL PLANE</i></div><nav className="cp-nav">{sections.slice(0,6).map(({href,label})=><Link key={href} className={path===href||path.startsWith(href+'/')?'active':''} href={href}>{label}</Link>)}</nav><div className="header-actions">{actions}<span className="api-pill"><Activity size={12}/> LIVE</span><button className="ghost-icon" onClick={()=>setOpen(v=>!v)}>{String(session.user?.name||'S').slice(0,1).toUpperCase()}</button></div>{open&&<div className="cp-menu"><b>{session.user?.name}</b><small>{session.user?.role}</small>{sections.slice(6).map(({href,label,icon:Icon})=><Link key={href} href={href}><Icon size={13}/>{label}</Link>)}<button onClick={logout}><LogOut size={13}/> LOG OUT</button></div>}</header><main className="workspace"><div className="page-titlebar"><div><p className="eyebrow">{eyebrow||'SWITCHBOARD'}</p><h1>{title}</h1></div></div><section className="workspace-content">{children}</section></main></div>
}

export function EmptyState({title,body,action}:{title:string;body:string;action?:React.ReactNode}){return <div className="empty-state"><div className="empty-icon"><Database size={24}/></div><h3>{title}</h3><p>{body}</p>{action}</div>}
