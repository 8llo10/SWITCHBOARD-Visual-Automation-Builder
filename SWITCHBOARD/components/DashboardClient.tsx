'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Network,Workflow} from 'lucide-react';
import {sb} from '../lib/switchboard';

export function DashboardClient(){
 const[state,setState]=useState<any>({workflows:[],runs:[],directory:[],audit:[],loading:true});
 const load=()=>Promise.allSettled([sb('/workflows'),sb('/runs'),sb('/directory/users'),sb('/audit?limit=8')]).then(r=>setState({workflows:r[0].status==='fulfilled'?r[0].value:[],runs:r[1].status==='fulfilled'?r[1].value:[],directory:r[2].status==='fulfilled'?r[2].value:[],audit:r[3].status==='fulfilled'?r[3].value:[],loading:false}));
 useEffect(()=>{void load();const t=setInterval(()=>void load(),4000);return()=>clearInterval(t)},[]);
 const stats=useMemo(()=>{const success=state.runs.filter((r:any)=>r.status==='SUCCEEDED').length,failed=state.runs.filter((r:any)=>r.status==='FAILED').length,running=state.runs.filter((r:any)=>r.status==='RUNNING'||r.status==='QUEUED').length,active=state.workflows.filter((w:any)=>w.status==='ACTIVE').length;return{success,failed,running,active}},[state]);
 return <div>
  <div className="neo-grid">
   <div className="neo-card neo-stat"><small>ACTIVE WORKFLOWS</small><b>{state.loading?'—':stats.active}</b><span>{state.workflows.length} total definitions</span></div>
   <div className="neo-card neo-stat"><small>LIVE EXECUTIONS</small><b>{state.loading?'—':stats.running}</b><span><i className="neo-pulse"/>polling every 4s</span></div>
   <div className="neo-card neo-stat"><small>DELIVERED</small><b>{state.loading?'—':stats.success}</b><span>successful recent runs</span></div>
   <div className="neo-card neo-stat"><small>MISSED</small><b>{state.loading?'—':stats.failed}</b><span>failed recent runs</span></div>
  </div>
  <section className="neo-section"><div className="neo-section-head"><div><small>EXECUTION BUS</small><h2>Live event stream</h2></div><Link href="/runs" className="text-link">OPEN RUNS <ArrowUpRight size={12}/></Link></div><div className="neo-list">{state.runs.slice(0,8).map((r:any)=><Link className="neo-row" href={`/runs/${r.id}`} key={r.id}><b>{r.workflow?.name||r.workflowId}</b><span>{r.status==='RUNNING'&&<i className="neo-pulse"/>}{r.status}</span><span>{r.triggerType}</span><span>{new Date(r.createdAt).toLocaleTimeString()}</span></Link>)}{!state.loading&&!state.runs.length&&<div className="neo-row"><b>No execution events yet.</b><span>—</span><span>—</span><span>—</span></div>}</div></section>
  <section className="neo-section"><div className="neo-section-head"><div><small>TOPOLOGY</small><h2>Automation network</h2></div><Link href="/workflows" className="primary-btn compact">OPEN VISUAL MAP <Network size={13}/></Link></div><div className="neo-workflow-grid">{state.workflows.slice(0,8).map((w:any)=><Link key={w.id} href={`/workflows/${w.id}`} className="neo-workflow"><span className="node-mini"><Workflow size={16}/></span><h3>{w.name}</h3><p>{w.description||'Visual automation workflow'}</p><footer><span>{w.status}</span><span>V{w.version}</span></footer></Link>)}</div></section>
 </div>
}
