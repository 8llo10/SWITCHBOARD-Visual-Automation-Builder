'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {ArrowLeft,CheckCircle2,Clock3,RotateCcw,Square,ThumbsDown,ThumbsUp,XCircle,Zap} from 'lucide-react';
import {Shell} from '../../../components/Shell';
import {sb} from '../../../lib/switchboard';
const terminal=['SUCCEEDED','FAILED','CANCELLED'];
export default function RunDetail(){
 const p=useParams<{id:string}>(),id=p.id;
 const[run,setRun]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=async()=>{try{setRun(await sb<any>(`/runs/${id}`));setError('')}catch(e:any){setError(e.message)}};
 useEffect(()=>{void load();const t=setInterval(()=>{if(!run||!terminal.includes(run.status))void load()},2200);return()=>clearInterval(t)},[id,run?.status]);
 async function action(name:string,body?:any){setBusy(name);try{await sb(`/runs/${id}/${name}`,{method:'POST',body:JSON.stringify(body||{})});await load()}catch(e:any){setError(e.message)}finally{setBusy('')}}
 const steps=run?.steps||[],logs=run?.logs||[];
 const done=steps.filter((s:any)=>['SUCCEEDED','FAILED','SKIPPED'].includes(s.status)).length,pct=steps.length?Math.round(done/steps.length*100):0;
 const duration=useMemo(()=>{if(!run?.startedAt)return 0;const end=run.finishedAt?new Date(run.finishedAt).getTime():Date.now();return Math.max(0,Math.round((end-new Date(run.startedAt).getTime())/1000))},[run]);
 return <Shell title="Execution" eyebrow="RUN TRACE" actions={<Link href="/workflows" className="secondary-btn compact"><ArrowLeft size={13}/> Workflows</Link>}><div className="run-detail-pro">{error&&<div className="error-panel"><XCircle/>{error}</div>}{run&&<>
  <section className="run-detail-hero"><div><span className={`run-state-pill ${String(run.status).toLowerCase()}`}>{!terminal.includes(run.status)&&<i/>}{run.status}</span><h2>{run.workflow?.name||'Workflow execution'}</h2><p>{run.id}</p></div><div className="run-detail-actions">{run.status==='WAITING'&&<><button onClick={()=>action('approve')} disabled={!!busy}><ThumbsUp size={13}/>Approve</button><button onClick={()=>action('reject',{reason:'Rejected from console'})} disabled={!!busy}><ThumbsDown size={13}/>Reject</button></>}<button onClick={()=>action('retry')} disabled={!!busy}><RotateCcw size={13}/>Retry</button>{!terminal.includes(run.status)&&<button className="danger" onClick={()=>action('cancel')} disabled={!!busy}><Square size={13}/>Cancel</button>}</div></section>
  <section className="run-summary-grid"><div><small>PROGRESS</small><b>{pct}%</b><span>{done}/{steps.length} completed</span></div><div><small>SUCCEEDED</small><b>{steps.filter((s:any)=>s.status==='SUCCEEDED').length}</b><span>nodes delivered</span></div><div><small>FAILED</small><b>{steps.filter((s:any)=>s.status==='FAILED').length}</b><span>nodes missed</span></div><div><small>DURATION</small><b>{duration}s</b><span>{run.triggerType} trigger</span></div></section>
  <section className="run-progress-card"><div className="run-progress-head"><span>Execution progress</span><b>{pct}%</b></div><div className="run-progress-track"><i style={{width:`${pct}%`}}/></div></section>
  <div className="run-detail-grid"><section className="run-detail-card"><header><div><small>WORKFLOW PATH</small><h3>Steps</h3></div><Zap size={16}/></header><div className="run-step-list">{steps.map((s:any,i:number)=><div className={`run-step ${String(s.status).toLowerCase()}`} key={s.id}><span className="run-step-index">{s.status==='SUCCEEDED'?<CheckCircle2 size={15}/>:s.status==='FAILED'?<XCircle size={15}/>:<Clock3 size={15}/>}</span><div><b>{s.label}</b><small>{s.nodeType} · attempt {s.attempt}</small></div><span className="run-step-status">{s.status}</span>{i<steps.length-1&&<i className="run-step-line"/>}</div>)}{!steps.length&&<div className="automation-empty"><Clock3 size={20}/><b>Waiting for execution</b><small>Steps will appear here as the engine runs.</small></div>}</div></section>
   <section className="run-detail-card"><header><div><small>EVENT STREAM</small><h3>Logs</h3></div>{!terminal.includes(run.status)&&<span className="live-mini"><i/>LIVE</span>}</header><div className="run-log-list">{logs.map((l:any)=><div className="run-log" key={l.id}><span className={`log-level ${String(l.level).toLowerCase()}`}/><div><b>{l.message}</b><small>{l.nodeId||'system'} · {new Date(l.createdAt).toLocaleTimeString()}</small></div></div>)}{!logs.length&&<div className="automation-empty"><Clock3 size={20}/><b>No logs yet</b><small>Runtime events will stream here.</small></div>}</div></section></div>
 </>}</div></Shell>}
