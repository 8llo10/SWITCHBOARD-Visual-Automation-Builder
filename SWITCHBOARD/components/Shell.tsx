'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,Audit,Boxes,Braces,ChevronRight,Database,KeyRound,LayoutDashboard,LogOut,Play,Settings,ShieldCheck,Users,Workflow,Zap} from 'lucide-react';
import {Logo} from './Logo';
import {clearSession,getSession} from '../lib/switchboard';

const sections=[
  {href:'/dashboard',label:'Overview',icon:LayoutDashboard},
  {href:'/workflows',label:'Workflows',icon:Workflow},
  {href:'/runs',label:'Runs & logs',icon:Play},
  {href:'/triggers',label:'Triggers',icon:Zap},
  {href:'/credentials',label:'Credentials',icon:KeyRound},
  {href:'/directory',label:'Directory',icon:Users},
  {href:'/audit',label:'Audit',icon:Audit},
  {href:'/users',label:'Users',icon:ShieldCheck},
  {href:'/settings',label:'Settings',icon:Settings},
];

export function Shell({children,title,eyebrow,actions}:{children:React.ReactNode;title:string;eyebrow?:string;actions?:React.ReactNode}){
  const path=usePathname(); const router=useRouter(); const session=getSession() as any;
  const logout=()=>{clearSession();router.push('/login')};
  return <div className="app-shell">
    <aside className="sidebar glass-panel">
      <Link href="/dashboard" className="sidebar-logo"><Logo size={44}/></Link>
      <nav className="sidebar-nav">{sections.map(({href,label,icon:Icon})=>{const active=path===href||path.startsWith(href+'/');return <Link key={href} href={href} className={`nav-item ${active?'active':''}`}><Icon size={18}/><span>{label}</span>{active&&<ChevronRight size={14} className="nav-arrow"/>}</Link>})}</nav>
      <div className="sidebar-meta">
        <div className="status-row"><span className="status-dot"/>API connected</div>
        <div className="profile-card"><div className="avatar">{String(session?.user?.name||'S').slice(0,1).toUpperCase()}</div><div><strong>{session?.user?.name||'Operator'}</strong><small>{session?.user?.role||'SESSION'}</small></div><button className="icon-btn" onClick={logout} aria-label="Logout"><LogOut size={16}/></button></div>
      </div>
    </aside>
    <main className="workspace">
      <header className="workspace-header"><div><p className="eyebrow">{eyebrow||'SWITCHBOARD CONTROL PLANE'}</p><h1>{title}</h1></div><div className="header-actions">{actions}<span className="api-pill"><Activity size={14}/> LIVE</span></div></header>
      <section className="workspace-content">{children}</section>
    </main>
  </div>
}

export function EmptyState({icon='workflow',title,body,action}:{icon?:string;title:string;body:string;action?:React.ReactNode}){
  const Icon=icon==='db'?Database:icon==='code'?Braces:icon==='blocks'?Boxes:Workflow;
  return <div className="empty-state"><div className="empty-icon"><Icon size={26}/></div><h3>{title}</h3><p>{body}</p>{action}</div>
}
