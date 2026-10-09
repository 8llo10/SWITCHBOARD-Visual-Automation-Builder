'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,ArrowUpRight,ChartNoAxesCombined,ChevronLeft,ChevronRight,KeyRound,LogOut,Network,ScrollText,Settings,ShieldCheck,Users,Workflow,Zap} from 'lucide-react';
import {getSession,logoutSession} from '../lib/switchboard';

const sections=[
  {href:'/dashboard',label:'Overview',icon:ChartNoAxesCombined},
  {href:'/workflows',label:'Workflows',icon:Workflow},
  {href:'/runs',label:'Executions',icon:Activity},
  {href:'/triggers',label:'Triggers',icon:Zap},
  {href:'/credentials',label:'Credentials',icon:KeyRound},
  {href:'/directory',label:'Directory',icon:Users},
  {href:'/audit',label:'Audit logs',icon:ScrollText},
  {href:'/users',label:'Team & roles',icon:ShieldCheck},
  {href:'/settings',label:'System status',icon:Settings},
];

export function Shell({children,title,eyebrow,actions}:{children:React.ReactNode;title:string;eyebrow?:string;actions?:React.ReactNode}){
 const path=usePathname(),router=useRouter();
 const [session,setSessionState]=useState<ReturnType<typeof getSession>|undefined>(undefined);
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{const current=getSession();if(!current){router.replace('/login');return}setSessionState(current)},[router]);
 const logout=async()=>{await logoutSession();router.replace('/login')};
 if(!session)return <div className="sb-loading-screen" role="status"><span className="sb-loader"/><strong>Preparing your workspace</strong></div>;
 const username=String((session.user as any)?.name||'Operator');
 return <div className={`product-shell sb-app-shell ${collapsed?'rail-collapsed':''}`}>
  <aside className="product-rail" aria-label="Workspace navigation">
   <Link href="/workflows" className="rail-brand" aria-label="Switchboard workflows"><span className="rail-brand-mark"><Network size={20}/></span><span className="rail-brand-copy"><b>SWITCHBOARD</b><small>Automation workspace</small></span></Link>
   <div className="sb-sidebar-label">WORKSPACE</div>
   <nav className="rail-nav" aria-label="Main navigation">{sections.map(({href,label,icon:Icon})=>{const active=path===href||path.startsWith(href+'/');return <Link key={href} href={href} title={label} aria-current={active?'page':undefined} className={`rail-link ${active?'active':''}`}><Icon size={19} strokeWidth={1.8}/><span>{label}</span>{active&&<i/>}</Link>})}</nav>
   <div className="rail-bottom">
    <Link href="/workflows" className="sb-sidebar-tip"><span><Zap size={15}/> QUICK ACCESS</span><b>Build an automation</b><small>Open your visual workflow editor <ArrowUpRight size={12}/></small></Link>
    <div className="rail-user"><span className="rail-avatar">{username.slice(0,1).toUpperCase()}</span><span className="rail-user-copy"><b>{username}</b><small>{String((session.user as any)?.role||'Operator')}</small></span><button type="button" onClick={()=>void logout()} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    <button type="button" className="rail-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}<span>{collapsed?'Expand':'Collapse'} sidebar</span></button>
   </div>
  </aside>
  <main className="product-main">
   <header className="product-topbar"><div className="sb-page-heading"><p>{eyebrow||'AUTOMATION WORKSPACE'}</p><h1>{title}</h1></div><div className="product-top-actions">{actions}<span className="sb-top-avatar" aria-label={username}>{username.slice(0,1).toUpperCase()}</span></div></header>
   <section className="product-content">{children}</section>
  </main>
 </div>
}
export function EmptyState({title,body,action}:{title:string;body:string;action?:React.ReactNode}){return <div className="empty-state"><div className="empty-icon"><Workflow size={26}/></div><h3>{title}</h3><p>{body}</p>{action}</div>}
