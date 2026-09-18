import Link from 'next/link';
import {Activity,KeyRound,Network,ScrollText,Settings,ShieldCheck,Users,Workflow,Zap} from 'lucide-react';

const items=[
 {href:'/workflows',label:'Workflows',icon:Workflow},
 {href:'/triggers',label:'Triggers',icon:Zap},
 {href:'/credentials',label:'Secrets',icon:KeyRound},
 {href:'/directory',label:'Directory',icon:Users},
 {href:'/audit',label:'Audit',icon:ScrollText},
 {href:'/users',label:'Users',icon:ShieldCheck},
 {href:'/settings',label:'System',icon:Settings},
];

export function EditorRail(){return <aside className="editor-rail"><Link href="/workflows" className="editor-rail-brand" title="SWITCHBOARD"><Network size={20}/></Link><nav>{items.map(({href,label,icon:Icon},i)=><Link key={href} href={href} className={i===0?'active':''} title={label}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="editor-rail-live" title="API connected"><Activity size={16}/><i/></div></aside>}
