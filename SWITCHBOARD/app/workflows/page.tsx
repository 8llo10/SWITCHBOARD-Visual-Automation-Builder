'use client';
import {FormEvent,useCallback,useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Activity,ArrowRight,CheckCircle2,Clock3,LayoutDashboard,LogOut,Plus,Search,Workflow,X,Zap} from 'lucide-react';
import {getSession,logoutSession,sb} from '../../lib/switchboard';
import './workflows.css';
import {Shell} from '../../components/Shell';

type WorkflowItem={id:string;name:string;slug:string;description?:string|null;status:string;version?:number;updatedAt?:string};
export default function WorkflowsPage(){
 const router=useRouter();
 const [workflows,setWorkflows]=useState<WorkflowItem[]>([]);
 const [runs,setRuns]=useState<Array<{id:string;status:string}>>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('ALL');
 const [modal,setModal]=useState(false);
 const [name,setName]=useState('');
 const [description,setDescription]=useState('');
 const [busy,setBusy]=useState(false);
 const [userName,setUserName]=useState('');
 const load=useCallback(async()=>{
  try{
   const [w,r]=await Promise.allSettled([sb<WorkflowItem[]>('/workflows'),sb<Array<{id:string;status:string}>>('/runs')]);
   if(w.status==='rejected')throw w.reason;
   setWorkflows(Array.isArray(w.value)?w.value:[]);
   if(r.status==='fulfilled')setRuns(Array.isArray(r.value)?r.value:[]);
   setError('');
  }catch(e:any){setError(e?.message||'Could not load workflows. Please retry.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{const session=getSession();if(!session){router.replace('/login');return}setUserName(String((session.user as any)?.name||'Operator'));void load()},[router,load]);
 useEffect(()=>{if(new URLSearchParams(window.location.search).has('create')){setModal(true);window.history.replaceState(null,'','/workflows')}},[]);
 useEffect(()=>{if(!modal)return;function close(e:KeyboardEvent){if(e.key==='Escape')setModal(false)}window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[modal]);
 const filtered=useMemo(()=>workflows.filter(w=>(filter==='ALL'||w.status===filter)&&(w.name+' '+(w.description||'')).toLowerCase().includes(query.toLowerCase())),[workflows,filter,query]);
 const active=workflows.filter(w=>w.status==='ACTIVE').length;
 const successful=runs.filter(r=>r.status==='SUCCEEDED').length;
 const inProgress=runs.filter(r=>r.status==='RUNNING'||r.status==='QUEUED').length;
 async function create(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setError('');
  try{const slug=(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'workflow')+'-'+Date.now().toString(36);
   const w=await sb<WorkflowItem>('/workflows',{method:'POST',body:JSON.stringify({name:name.trim(),slug,description:description.trim(),status:'DRAFT',definition:{nodes:[{id:'start',type:'custom',position:{x:180,y:220},data:{label:'Manual Trigger',kind:'trigger',config:{}}}],edges:[]}})});
   router.push('/workflows/'+w.id);
  }catch(e:any){setError(e?.message||'Unable to create workflow')}finally{setBusy(false)}
 }
 async function logout(){await logoutSession();router.replace('/login')}
 return <Shell title="Workflows" eyebrow="AUTOMATION WORKSPACE"><div className="wf-home sb-in-shell">
  <div className="wf-intro"><div><p className="wf-kicker">Automation workspace · {userName}</p><h1>Your workflows</h1><p>Build, manage, and monitor automations in one place. Pick up where you left off or start something new.</p></div><button type="button" className="wf-btn wf-btn-primary" onClick={()=>setModal(true)}><Plus size={17}/> New workflow</button></div>
  <section className="wf-stats" aria-label="Workspace overview"><div className="wf-stat"><span className="wf-stat-label"><Workflow size={15}/> Total workflows</span><strong>{loading?'—':workflows.length}</strong></div><div className="wf-stat"><span className="wf-stat-label"><Zap size={15}/> Active</span><strong>{loading?'—':active}</strong></div><div className="wf-stat"><span className="wf-stat-label"><CheckCircle2 size={15}/> Successful runs</span><strong>{loading?'—':successful}</strong></div><div className="wf-stat"><span className="wf-stat-label"><Activity size={15}/> In progress</span><strong>{loading?'—':inProgress}</strong></div></section>
  <section aria-label="Workflows"><div className="wf-section-head"><h2>All workflows</h2><div className="wf-toolbar"><label className="wf-search"><Search size={16}/><input aria-label="Search workflows" placeholder="Search workflows..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select className="wf-filter" aria-label="Filter workflow status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></div></div>
   {error&&<div className="wf-alert" role="alert">{error} <button type="button" onClick={()=>void load()} className="wf-icon-button" style={{textDecoration:'underline',color:'inherit'}}>Retry</button></div>}
   {loading?<div className="wf-loading" aria-label="Loading workflows">{[0,1,2].map(i=><div className="wf-skeleton" key={i}/>)}</div>:filtered.length?<div className="wf-grid">{filtered.map(w=><Link className="wf-tile" href={'/workflows/'+w.id} key={w.id}><div className="wf-tile-top"><span className="wf-tile-icon"><Workflow size={22}/></span><span className={'wf-status '+(w.status==='ACTIVE'?'active':'')}>{w.status}</span></div><h3>{w.name}</h3><p>{w.description||'Design and automate operations with the visual workflow builder.'}</p><div className="wf-tile-bottom"><span><Clock3 size={13} style={{verticalAlign:'middle',marginRight:5}}/>{w.updatedAt?new Date(w.updatedAt).toLocaleDateString():'Workflow'} · v{w.version||1}</span><span>Open editor <ArrowRight size={13} style={{verticalAlign:'middle'}}/></span></div></Link>)}</div>:<div className="wf-empty"><Workflow size={35}/><h3>{workflows.length?'No matching workflows':'Your workspace is ready'}</h3><p>{workflows.length?'Try another search or status filter.':'Create your first automation and connect nodes on a visual canvas.'}</p><button type="button" className="wf-btn wf-btn-primary" onClick={()=>workflows.length?(setQuery(''),setFilter('ALL')):setModal(true)}>{workflows.length?'Clear filters':'Create your first workflow'} <ArrowRight size={15}/></button></div>}
  </section>
  {modal&&<div className="wf-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="wf-modal" onSubmit={create} role="dialog" aria-modal="true" aria-labelledby="wf-modal-title"><div className="wf-modal-heading"><h2 id="wf-modal-title">New workflow</h2><button type="button" className="wf-icon-button" aria-label="Close" onClick={()=>setModal(false)}><X size={20}/></button></div><p>Give your automation a name. You can configure triggers and actions in the editor.</p><label className="wf-field" htmlFor="wf-name">Workflow name</label><input id="wf-name" autoFocus maxLength={120} required placeholder="e.g. New employee onboarding" value={name} onChange={e=>setName(e.target.value)}/><label className="wf-field" htmlFor="wf-description">Description (optional)</label><input id="wf-description" maxLength={1000} placeholder="What does this workflow automate?" value={description} onChange={e=>setDescription(e.target.value)}/><div className="wf-modal-actions"><button type="button" className="wf-btn" onClick={()=>setModal(false)}>Cancel</button><button className="wf-btn wf-btn-primary" type="submit" disabled={busy||!name.trim()}>{busy?'Creating…':'Create workflow'} <ArrowRight size={16}/></button></div></form></div>}
 </div></Shell>;
}
