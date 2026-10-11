'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowUpRight,CheckCircle2,Clock3,Plus,RefreshCw,Workflow,Zap} from 'lucide-react';
import {sb} from '../lib/switchboard';
type Flow={id:string;name:string;description?:string;status:string;version?:number;updatedAt?:string};
type Run={id:string;workflowId:string;workflow?:{name:string};status:string;createdAt:string;triggerType?:string};
export function DashboardClient(){
 const [workflows,setWorkflows]=useState<Flow[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [lastUpdate,setLastUpdate]=useState<string|null>(null);
 const load=useCallback(async()=>{
  const [wf,rs]=await Promise.allSettled([sb<Flow[]>('/workflows'),sb<Run[]>('/runs')]);
  if(wf.status==='fulfilled')setWorkflows(Array.isArray(wf.value)?wf.value:[]);
  if(rs.status==='fulfilled')setRuns(Array.isArray(rs.value)?rs.value:[]);
  setError(wf.status==='rejected'&&rs.status==='rejected'?'Could not reach the workspace API. Check your connection and retry.':wf.status==='rejected'?'Workflow metrics could not be loaded.':rs.status==='rejected'?'Execution metrics could not be loaded.':'');
  setLastUpdate(new Date().toLocaleTimeString());
  setLoading(false);
 },[]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),15000);return()=>clearInterval(timer)},[load]);
 const stats=useMemo(()=>({active:workflows.filter(w=>w.status==='ACTIVE').length,successful:runs.filter(r=>r.status==='SUCCEEDED').length,failed:runs.filter(r=>r.status==='FAILED').length,inProgress:runs.filter(r=>r.status==='RUNNING'||r.status==='QUEUED'||r.status==='WAITING').length}),[workflows,runs]);
 const activity=useMemo(()=>Array.from({length:7},(_,i)=>{
  const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-i));
  const next=new Date(date);next.setDate(date.getDate()+1);
  const recent=runs.filter(r=>{const when=new Date(r.createdAt);return when>=date&&when<next});
  return{key:date.toISOString(),label:date.toLocaleDateString(undefined,{weekday:'short'}),day:date.toLocaleDateString(undefined,{month:'short',day:'numeric'}),success:recent.filter(r=>r.status==='SUCCEEDED').length,failed:recent.filter(r=>r.status==='FAILED').length,other:recent.filter(r=>!['SUCCEEDED','FAILED'].includes(r.status)).length};
 }),[runs]);
 const activityMax=Math.max(1,...activity.map(x=>x.success+x.failed+x.other));
 const completed=stats.successful+stats.failed;
 const successRate=completed?Math.round(stats.successful/completed*100):0;
 return <div className="ov-dashboard">
  <div className="ov-welcome"><div><p className="ov-kicker">OPERATIONS AT A GLANCE</p><h2>Keep every workflow in view.</h2><p>Real activity from your automation workspace, all in one place.</p></div><div className="ov-welcome-actions"><button type="button" className="wf-btn" onClick={()=>void load()} title="Refresh data"><RefreshCw size={16}/>Refresh</button><Link href="/workflows" className="wf-btn wf-btn-primary"><Plus size={16}/>Manage workflows</Link></div></div>
  {error&&<div role="alert" className="wf-alert">{error} <button onClick={()=>void load()} type="button" className="wf-icon-button" style={{color:'inherit',textDecoration:'underline'}}>Retry</button></div>}
  <section className="ov-kpis" aria-label="Workspace metrics">
   {[
     {title:'Total workflows',value:workflows.length,icon:Workflow,sub:'All saved automations'},
     {title:'Active workflows',value:stats.active,icon:Zap,sub:'Enabled and ready'},
     {title:'Successful runs',value:stats.successful,icon:CheckCircle2,sub:'From recent history'},
     {title:'In progress',value:stats.inProgress,icon:Activity,sub:'Running, queued or waiting'}
   ].map(({title,value,icon:Icon,sub})=><div key={title} className="ov-kpi"><div className="ov-kpi-label"><span>{title}</span><Icon size={19}/></div><strong>{loading?'—':value}</strong><small>{sub}</small></div>)}
  </section>
  <div className="ov-grid"><section className="ov-panel ov-primary"><div className="ov-panel-heading"><div><span>LIVE ACTIVITY</span><h3>Recent executions</h3></div><Link href="/runs">View all <ArrowUpRight size={14}/></Link></div>{loading?<div className="ov-loading">Loading activity…</div>:runs.length?<div className="ov-runs">{runs.slice(0,7).map(r=><Link key={r.id} href={`/runs/${r.id}`} className="ov-run"><span className={`ov-run-dot ${r.status.toLowerCase()}`}/><span className="ov-run-main"><b>{r.workflow?.name||'Workflow execution'}</b><small>{r.triggerType||'Manual'} · {new Date(r.createdAt).toLocaleString()}</small></span><span className={`wf-status ${r.status==='SUCCEEDED'?'active':''}`}>{r.status}</span><ArrowUpRight size={16}/></Link>)}</div>:<div className="ov-empty"><Activity size={26}/><b>No executions yet</b><p>Runs appear here when your automations execute.</p><Link href="/workflows">Open workflows →</Link></div>}</section>
   <section className="ov-panel"><div className="ov-panel-heading"><div><span>RELIABILITY</span><h3>Execution health</h3></div><Activity size={18}/></div><div className="ov-success"><strong>{loading?'—':completed?successRate+'%':'—'}</strong><span>Recent completion success rate</span></div><div className="ov-health-track" role="img" aria-label={`Recent success rate ${successRate} percent`}><div style={{width:successRate+'%'}}/></div><div className="ov-health-legend"><span><i className="green"/>{stats.successful} successful</span><span><i className="red"/>{stats.failed} failed</span></div><div className="ov-health-foot"><Clock3 size={15}/>{lastUpdate?'Last refreshed '+lastUpdate:'Awaiting first refresh'}</div></section>
  </div>
  <section className="ov-panel ov-trends" aria-label="Execution activity over the last seven days"><div className="ov-panel-heading"><div><span>EXECUTION SIGNAL</span><h3>Activity this week</h3></div><div className="ov-chart-legend"><span><i className="green"/>Succeeded</span><span><i className="red"/>Failed</span><span><i className="blue"/>Other</span></div></div><p className="ov-chart-note">Last seven days · based on the most recent loaded runs</p><div className="ov-chart-bars">{activity.map(day=><div className="ov-chart-day" key={day.key} title={day.day+': '+(day.success+day.failed+day.other)+' runs'}><div className="ov-chart-stack" aria-label={day.day+': '+day.success+' successful, '+day.failed+' failed, '+day.other+' other runs'} role="img"><span className="ov-bar-remaining" style={{height:(day.other/activityMax*100)+'%'}}/><span className="ov-bar-failed" style={{height:(day.failed/activityMax*100)+'%'}}/><span className="ov-bar-success" style={{height:(day.success/activityMax*100)+'%'}}/></div><span className="ov-chart-day-label">{day.label}</span></div>)}</div></section>
  <section className="ov-panel ov-workflows"><div className="ov-panel-heading"><div><span>YOUR AUTOMATIONS</span><h3>Workflows</h3></div><Link href="/workflows">Browse all <ArrowUpRight size={14}/></Link></div>{loading?<div className="ov-loading">Loading workflows…</div>:workflows.length?<div className="ov-flow-grid">{workflows.slice(0,6).map(w=><Link href={`/workflows/${w.id}`} key={w.id} className="ov-flow"><span className="ov-flow-symbol"><Workflow size={20}/></span><span className="wf-status">{w.status}</span><b>{w.name}</b><small>{w.description||'Visual IT automation workflow'}</small><span className="ov-flow-open">Open editor <ArrowUpRight size={14}/></span></Link>)}</div>:<div className="ov-empty"><Workflow size={26}/><b>Nothing here yet</b><p>Create your first workflow to start automating.</p><Link href="/workflows">Create workflow →</Link></div>}</section>
 </div>;
}
