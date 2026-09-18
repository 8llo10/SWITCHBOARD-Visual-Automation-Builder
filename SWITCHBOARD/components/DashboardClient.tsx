'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowUpRight,CheckCircle2,Play,Users,Workflow,Zap,Clock3,ShieldCheck} from 'lucide-react';
import {sb} from '../lib/switchboard';
import {Badge,formatDate} from './DataView';
import styles from './ControlRoom.module.css';

const terminal=['SUCCEEDED','FAILED','CANCELLED'];
export function DashboardClient(){
 const [state,setState]=useState<any>({workflows:[],runs:[],directory:[],audit:[],loading:true});
 const [tick,setTick]=useState(0);
 useEffect(()=>{let alive=true;const load=async()=>{const r=await Promise.allSettled([sb('/workflows'),sb('/runs'),sb('/directory/users'),sb('/audit?limit=8')]);if(!alive)return;setState({workflows:r[0].status==='fulfilled'?r[0].value:[],runs:r[1].status==='fulfilled'?r[1].value:[],directory:r[2].status==='fulfilled'?r[2].value:[],audit:r[3].status==='fulfilled'?r[3].value:[],loading:false});setTick(x=>x+1)};void load();const id=setInterval(load,4000);return()=>{alive=false;clearInterval(id)}},[]);
 const successful=state.runs.filter((r:any)=>r.status==='SUCCEEDED').length;
 const failed=state.runs.filter((r:any)=>r.status==='FAILED').length;
 const running=state.runs.filter((r:any)=>!terminal.includes(r.status)).length;
 const active=state.workflows.filter((w:any)=>w.status==='ACTIVE').length;
 const successRate=state.runs.length?Math.round(successful/state.runs.length*100):0;
 const latest=state.runs.slice(0,7);
 const activities=useMemo(()=>state.audit.slice(0,8),[state.audit,tick]);
 const card=(label:string,value:any,sub:string,Icon:any)=><div className={styles.pulseCard}><div className={styles.pulseTop}><span>{label}</span><span className={styles.pulseIcon}><Icon size={15}/></span></div><strong className={styles.pulseValue}>{state.loading?'—':value}</strong><div className={styles.pulseSub}>{sub}</div><span className={styles.signal}/></div>;
 return <div className={styles.controlRoom}>
  <div className={styles.liveStrip}><div className={styles.liveIdentity}><span className={styles.radar}><span className={styles.radarDot}/></span><div><b>SWITCHBOARD CONTROL ROOM</b><small>Live telemetry · refreshes every 4 seconds</small></div></div><div className={styles.liveStats}><div className={styles.liveStat}><strong>{running}</strong><span>Running</span></div><div className={styles.liveStat}><strong>{successRate}%</strong><span>Success rate</span></div><div className={styles.liveStat}><strong>{failed}</strong><span>Failed</span></div></div></div>
  <div className={styles.pulseGrid}>{card('Active workflows',active,`${state.workflows.length} total workflows`,Workflow)}{card('Recent runs',state.runs.length,`${running} currently live`,Play)}{card('Directory users',state.directory.length,'Automation targets',Users)}{card('Control plane','ONLINE','Render + Supabase',Activity)}</div>
  <div className={styles.runBoard}>
   <section className={styles.liveRuns}><div className={styles.sectionHead}><div><p className="eyebrow">LIVE EXECUTION</p><h2>Execution radar</h2></div><Link className="text-link" href="/runs">Open observability <ArrowUpRight size={14}/></Link></div><div className={styles.runList}>{latest.length?latest.map((r:any)=>{const steps=r._count?.steps||r.steps?.length||0;const isRunning=!terminal.includes(r.status);const pct=r.status==='SUCCEEDED'?100:r.status==='FAILED'?100:isRunning?55:15;return <Link href={`/runs/${r.id}`} key={r.id} className={`${styles.runRow} ${isRunning?styles.runRowActive:''}`}><div className={styles.runName}><b>{r.workflow?.name||r.workflowId}</b><small>{r.triggerType} · {formatDate(r.createdAt)}</small><div className={styles.runProgress}><div className={styles.runProgressFill} style={{width:`${pct}%`}}/></div></div><div className={styles.runMeta}>{steps||'—'} steps</div><div className={styles.runMeta}>{r.status}</div><span className={`${styles.statusOrb} ${r.status==='RUNNING'?styles.statusOrbRunning:r.status==='SUCCEEDED'?styles.statusOrbSuccess:r.status==='FAILED'?styles.statusOrbFailed:''}`}/></Link>}):<div className="muted">No runs yet.</div>}</div></section>
   <section className={styles.activityRail}><div className={styles.sectionHead}><div><p className="eyebrow">ACTIVITY</p><h2>Operator stream</h2></div><ShieldCheck size={18}/></div><div className={styles.activityItems}>{activities.length?activities.map((a:any)=><div key={a.id} className={styles.activityItem}><b>{a.action||'Platform event'}</b><small>{a.entity||'System'}{a.entityId?` · ${a.entityId}`:''} · {formatDate(a.createdAt)}</small></div>):<><div className={styles.activityItem}><b>RBAC online</b><small>Admin / Operator / Viewer</small></div><div className={styles.activityItem}><b>Credential vault ready</b><small>Encrypted secret storage</small></div><div className={styles.activityItem}><b>Webhook guard active</b><small>Timing-safe validation</small></div></>}</div></section>
  </div>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">AUTOMATION ESTATE</p><h2>Workflows ready for orchestration</h2></div><Link className="primary-btn compact" href="/workflows">Open builder <Zap size={15}/></Link></div><div className={styles.runList}>{state.workflows.slice(0,6).map((w:any)=><Link href={`/workflows/${w.id}`} className={styles.runRow} key={w.id}><div className={styles.runName}><b>{w.name}</b><small>Version v{w.version} · updated {formatDate(w.updatedAt)}</small></div><div className={styles.runMeta}>{w.status}</div><div className={styles.runMeta}>{w.slug}</div><Badge value={w.status}/></Link>)}</div></section>
 </div>
}
