'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowUpRight,CheckCircle2,Clock3,Play,ShieldCheck,Users,Workflow,Zap} from 'lucide-react';
import {sb} from '../lib/switchboard';
import {Badge,DataTable,Metric,formatDate} from './DataView';

export function DashboardClient(){
 const [state,setState]=useState<any>({workflows:[],runs:[],directory:[],audit:[],loading:true});
 useEffect(()=>{Promise.allSettled([sb('/workflows'),sb('/runs'),sb('/directory/users'),sb('/audit?limit=8')]).then(r=>setState({workflows:r[0].status==='fulfilled'?r[0].value:[],runs:r[1].status==='fulfilled'?r[1].value:[],directory:r[2].status==='fulfilled'?r[2].value:[],audit:r[3].status==='fulfilled'?r[3].value:[],loading:false}))},[]);
 const successful=state.runs.filter((r:any)=>r.status==='SUCCEEDED').length;
 const active=state.workflows.filter((w:any)=>w.status==='ACTIVE').length;
 return <div className="stack-lg">
   <div className="metrics-grid">
    <Metric label="Active workflows" value={state.loading?'—':active} sub={`${state.workflows.length} total`} icon={<Workflow size={18}/>}/>
    <Metric label="Recent runs" value={state.loading?'—':state.runs.length} sub={`${successful} succeeded`} icon={<Play size={18}/>}/>
    <Metric label="Directory users" value={state.loading?'—':state.directory.length} sub="Automation targets" icon={<Users size={18}/>}/>
    <Metric label="Control plane" value="ONLINE" sub="Render + Supabase" icon={<Activity size={18}/>}/>
   </div>
   <div className="dashboard-grid">
    <section className="panel span-2"><div className="panel-head"><div><p className="eyebrow">LIVE EXECUTION</p><h2>Recent runs</h2></div><Link className="text-link" href="/runs">View all <ArrowUpRight size={14}/></Link></div><DataTable rows={state.runs.slice(0,6)} href={(r:any)=>`/runs/${r.id}`} columns={[{key:'workflow',label:'Workflow',render:r=>r.workflow?.name||r.workflowId},{key:'status',label:'Status',render:r=><Badge value={r.status}/>},{key:'triggerType',label:'Trigger'},{key:'createdAt',label:'Created',render:r=>formatDate(r.createdAt)}]}/></section>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">SECURITY</p><h2>Platform posture</h2></div><ShieldCheck size={20}/></div><div className="health-list"><div><CheckCircle2/><span><b>RBAC</b><small>Admin / Operator / Viewer</small></span></div><div><CheckCircle2/><span><b>Encrypted secrets</b><small>Credential vault enabled</small></span></div><div><CheckCircle2/><span><b>Webhook security</b><small>Timing-safe secret validation</small></span></div><div><CheckCircle2/><span><b>Audit trail</b><small>Administrative actions tracked</small></span></div></div></section>
   </div>
   <div className="panel"><div className="panel-head"><div><p className="eyebrow">WORKFLOW INVENTORY</p><h2>Automation estate</h2></div><Link className="primary-btn compact" href="/workflows">Open builder <Zap size={15}/></Link></div><DataTable rows={state.workflows.slice(0,8)} href={(w:any)=>`/workflows/${w.id}`} columns={[{key:'name',label:'Name'},{key:'status',label:'Status',render:r=><Badge value={r.status}/>},{key:'version',label:'Version',render:r=>`v${r.version}`},{key:'updatedAt',label:'Last updated',render:r=>formatDate(r.updatedAt)}]}/></div>
 </div>
}
