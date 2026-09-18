'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,LogOut,Network,ScrollText,Settings,ShieldCheck,Users,Workflow,Zap,KeyRound,ChevronsLeft} from 'lucide-react';
import {getSession,logoutSession} from '../lib/switchboard';

const sections=[
  {href:'/workflows',label:'Workflows',icon:Workflow,primary:true},
  {href:'/triggers',label:'Triggers',icon:Zap},
  {href:'/credentials',label:'Secrets',icon:KeyRound},
  {href:'/directory',label:'Directory',icon:Users},
  {href:'/audit',label:'Audit',icon:ScrollText},
  {href:'/users',label:'Users',icon:ShieldCheck},
  {href:'/settings',label:'System',icon:Settings},
];

export function Shell({children,title,eyebrow,actions}:{children:React.ReactNode;title:string;eyebrow?:string;actions?:React.ReactNode}){
  const path=usePathname(),router=useRouter();
  const[session,setSessionState]=useState<any>(undefined),[collapsed,setCollapsed]=useState(false);
  useEffect(()=>{const current=getSession() as any;if(!current){router.replace('/login');return}setSessionState(current)},[router]);
  if(session===undefined)return <div className="auth-page"><div className="auth-card"><p className="eyebrow">SWITCHBOARD</p><h2>Checking session…</h2></div></div>;
  const logout=async()=>{await logoutSession();router.replace('/login')};
  return <div className={`product-shell ${collapsed?'rail-collapsed':''}`}>
    <aside className="product-rail">
      <Link href="/workflows" className="rail-brand"><span className="rail-brand-mark"><Network size={17}/></span><span className="rail-brand-copy"><b>SWITCHBOARD</b><small>Automation OS</small></span></Link>
      <nav className="rail-nav">{sections.map(({href,label,icon:Icon,primary})=>{const active=path===href||path.startsWith(href+'/');return <Link key={href} href={href} className={`rail-link ${active?'active':''} ${primary?'primary':''}`}><Icon size={17}/><span>{label}</span>{active&&<i/>}</Link>})}</nav>
      <div className="rail-bottom"><div className="rail-live"><Activity size={13}/><span>Control plane online</span></div><div className="rail-user"><span className="rail-avatar">{String(session.user?.name||'S').slice(0,1).toUpperCase()}</span><span className="rail-user-copy"><b>{session.user?.name||'Operator'}</b><small>{session.user?.role||'SESSION'}</small></span><button onClick={()=>void logout()} title="Log out"><LogOut size={14}/></button></div><button className="rail-collapse" onClick={()=>setCollapsed(v=>!v)}><ChevronsLeft size={14}/><span>{collapsed?'Expand':'Collapse'}</span></button></div>
    </aside>
    <main className="product-main"><header className="product-topbar"><div><p>{eyebrow||'SWITCHBOARD'}</p><h1>{title}</h1></div><div className="product-top-actions">{actions}</div></header><section className="product-content">{children}</section></main>
  </div>
}

export function EmptyState({title,body,action}:{title:string;body:string;action?:React.ReactNode}){return <div className="empty-state"><div className="empty-icon"><Workflow size={24}/></div><h3>{title}</h3><p>{body}</p>{action}</div>}
