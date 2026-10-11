'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,ArrowUpRight,ChartNoAxesCombined,ChevronLeft,ChevronRight,Command,Search,KeyRound,LogOut,Network,ScrollText,Settings,ShieldCheck,Users,Workflow,Zap} from 'lucide-react';
import {getSession,logoutSession,restoreSession} from '../lib/switchboard';
import {CommandPalette} from './CommandPalette';

const sections=[
  {href:'/dashboard',label:'Overview',icon:ChartNoAxesCombined,roles:['ADMIN','OPERATOR','VIEWER']},
  {href:'/workflows',label:'Workflows',icon:Workflow,roles:['ADMIN','OPERATOR','VIEWER']},
  {href:'/runs',label:'Executions',icon:Activity,roles:['ADMIN','OPERATOR','VIEWER']},
  {href:'/triggers',label:'Triggers',icon:Zap,roles:['ADMIN','OPERATOR','VIEWER']},
  {href:'/credentials',label:'Credentials',icon:KeyRound,roles:['ADMIN','OPERATOR']},
  {href:'/directory',label:'Directory',icon:Users,roles:['ADMIN','OPERATOR']},
  {href:'/audit',label:'Audit logs',icon:ScrollText,roles:['ADMIN']},
  {href:'/users',label:'Team & roles',icon:ShieldCheck,roles:['ADMIN']},
  {href:'/settings',label:'System status',icon:Settings,roles:['ADMIN','OPERATOR','VIEWER']},
];

export function Shell({children,title,eyebrow,actions}:{children:React.ReactNode;title:string;eyebrow?:string;actions?:React.ReactNode}){
 const path=usePathname(),router=useRouter();
 const [session,setSessionState]=useState<ReturnType<typeof getSession>|undefined>(undefined);
 const [authError,setAuthError]=useState('');
 const [retry,setRetry]=useState(0);
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{let alive=true;setAuthError('');restoreSession().then(current=>{if(!alive)return;if(!current){router.replace('/login');return}setSessionState(current)}).catch(e=>{if(alive)setAuthError(e?.message||'Unable to contact authentication service.')});return()=>{alive=false}},[router,retry]);
 const logout=async()=>{await logoutSession();router.replace('/login')};
 if(authError)return <div className="sb-loading-screen sb-auth-recovery" role="alert"><strong>Unable to verify your session</strong><p>{authError}</p><button type="button" onClick={()=>{setAuthError('');setRetry(n=>n+1)}}>Try again</button><button type="button" onClick={()=>void logout().then(()=>router.replace('/login'))}>Sign out</button></div>;
 if(!session)return <div className="sb-loading-screen" role="status"><span className="sb-loader"/><strong>Verifying your session…</strong></div>;
 const username=String((session.user as any)?.name||'Operator');
 return <div className={`product-shell sb-app-shell ${collapsed?'rail-collapsed':''}`}>
  <aside className="product-rail" aria-label="Workspace navigation">
   <Link href="/workflows" className="rail-brand" aria-label="Switchboard workflows"><span className="rail-brand-mark"><Network size={20}/></span><span className="rail-brand-copy"><b>SWITCHBOARD</b><small>Automation workspace</small></span></Link>
   <div className="sb-sidebar-label">WORKSPACE</div>
   <nav className="rail-nav" aria-label="Main navigation">{sections.filter(section=>section.roles.includes(String((session.user as any)?.role||'VIEWER'))).map(({href,label,icon:Icon})=>{const active=path===href||path.startsWith(href+'/');return <Link key={href} href={href} title={label} aria-current={active?'page':undefined} className={`rail-link ${active?'active':''}`}><Icon size={19} strokeWidth={1.8}/><span>{label}</span>{active&&<i/>}</Link>})}</nav>
   <div className="rail-bottom">
    <Link href="/workflows" className="sb-sidebar-tip"><span><Zap size={15}/> QUICK ACCESS</span><b>Build an automation</b><small>Open your visual workflow editor <ArrowUpRight size={12}/></small></Link>
    <div className="rail-user"><span className="rail-avatar">{username.slice(0,1).toUpperCase()}</span><span className="rail-user-copy"><b>{username}</b><small>{String((session.user as any)?.role||'Operator')}</small></span><button type="button" onClick={()=>void logout()} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    <button type="button" className="rail-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}<span>{collapsed?'Expand':'Collapse'} sidebar</span></button>
   </div>
  </aside>
  <main className="product-main">
   <header className="product-topbar"><div className="sb-page-heading"><p>{eyebrow||'AUTOMATION WORKSPACE'}</p><h1>{title}</h1></div><div className="product-top-actions"><button type="button" className="sb-command-trigger" aria-label="Search pages and workflows (Control K)" title="Search (Ctrl+K)" onClick={()=>window.dispatchEvent(new Event('switchboard:command'))}><Search size={17}/><span>Search anything</span><kbd><Command size={11}/> K</kbd></button>{actions}<span className="sb-top-avatar" aria-label={username}>{username.slice(0,1).toUpperCase()}</span></div></header>
   <section className="product-content">{children}</section>
  </main>
  <CommandPalette/>
 </div>
}
export function EmptyState({title,body,action}:{title:string;body:string;action?:React.ReactNode}){return <div className="empty-state"><div className="empty-icon"><Workflow size={26}/></div><h3>{title}</h3><p>{body}</p>{action}</div>}
