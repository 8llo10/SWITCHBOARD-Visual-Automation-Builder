'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowUpRight,Clock3,PlayCircle,RefreshCw,Workflow} from 'lucide-react';
import {Shell} from '../../components/Shell';
import {formatDate} from '../../components/DataView';
import {sb} from '../../lib/switchboard';
import styles from '../../components/ControlRoom.module.css';

const filters=['','RUNNING','SUCCEEDED','FAILED','WAITING','CANCELLED'];
export default function RunsPage(){
 const[status,setStatus]=useState('');const[rows,setRows]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[refreshing,setRefreshing]=useState(false);
 useEffect(()=>{let alive=true;const load=async(silent=false)=>{if(!silent)setLoading(true);else setRefreshing(true);try{const data=await sb<any[]>(`/runs${status?`?status=${status}`:''}`);if(alive)setRows(data)}finally{if(alive){setLoading(false);setRefreshing(false)}}};void load();const id=setInterval(()=>void load(true),3500);return()=>{alive=false;clearInterval(id)}},[status]);
 const counts=useMemo(()=>({running:rows.filter(r=>r.status==='RUNNING').length,success:rows.filter(r=>r.status==='SUCCEEDED').length,failed:rows.filter(r=>r.status==='FAILED').length}),[rows]);
 return <Shell title="Runs & logs" eyebrow="EXECUTION OBSERVABILITY"><div className={styles.controlRoom}>
  <section className={styles.runsHero}><div><p className="eyebrow">EXECUTION OBSERVABILITY</p><h2>Live run command center</h2><p><span className={styles.liveDot}/>Auto-refreshing every 3.5s · {rows.length} visible runs</p></div><div className={styles.liveStats}><div className={styles.liveStat}><strong>{counts.running}</strong><span>Running</span></div><div className={styles.liveStat}><strong>{counts.success}</strong><span>Succeeded</span></div><div className={styles.liveStat}><strong>{counts.failed}</strong><span>Failed</span></div></div></section>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">FILTER STREAM</p><h2>Execution history</h2></div><div className={styles.runFilters}>{filters.map(f=><button key={f||'ALL'} className={`${styles.filterButton} ${status===f?styles.filterActive:''}`} onClick={()=>setStatus(f)}>{f||'ALL'}</button>)}<button className={styles.filterButton} onClick={()=>setStatus(status)} title="Live polling active"><RefreshCw size={12} className={refreshing?'spin':''}/></button></div></div>
   {loading?<div className="muted">Loading execution stream…</div>:rows.length?<div className={styles.executionGrid}>{rows.map(r=>{const active=['RUNNING','QUEUED','WAITING'].includes(r.status);return <Link href={`/runs/${r.id}`} key={r.id} className={`${styles.executionCard} ${active?styles.executionCardRunning:''}`}><span className={styles.runGlyph}>{active?<Activity size={17}/>:<PlayCircle size={17}/>}</span><div className={styles.executionName}><b>{r.workflow?.name||r.workflowId}</b><small>{r.id}</small></div><div className={styles.executionDatum}><b>{r.status}</b><small>Status</small></div><div className={styles.executionDatum}><b>{r.triggerType}</b><small>Trigger</small></div><div className={styles.executionDatum}><b>{r._count?.steps??'—'}</b><small>Steps</small></div><ArrowUpRight size={15}/></Link>})}</div>:<div className="muted">No executions match this filter.</div>}
  </section>
 </div></Shell>
}
