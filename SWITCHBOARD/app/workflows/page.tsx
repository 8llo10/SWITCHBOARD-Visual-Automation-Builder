'use client';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus,Workflow} from 'lucide-react';
import {sb} from '../../lib/switchboard';

export default function WorkflowsPage(){
 const router=useRouter();
 const[loading,setLoading]=useState(true),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;(async()=>{try{const rows=await sb<any[]>('/workflows');if(!alive)return;if(rows[0]){router.replace(`/workflows/${rows[0].id}`);return}}catch(e:any){if(alive)setError(e.message)}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[router]);
 async function create(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const slug=(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`workflow-${Date.now()}`);const w=await sb<any>('/workflows',{method:'POST',body:JSON.stringify({name,slug,status:'DRAFT',definition:{nodes:[{id:'start',type:'custom',position:{x:180,y:220},data:{label:'Manual Trigger',kind:'trigger',config:{}}}],edges:[]}})});router.replace(`/workflows/${w.id}`)}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 if(loading)return <main className="workspace-boot"><div className="workspace-boot-card"><Workflow size={24}/><b>Opening workflow workspace…</b><span>Loading your latest automation.</span></div></main>;
 return <main className="workspace-boot"><form className="workspace-empty-create" onSubmit={create}><div className="workspace-empty-icon"><Workflow size={28}/></div><small>SWITCHBOARD AUTOMATION</small><h1>Create your first workflow</h1><p>The workflow canvas is the main workspace. Add nodes, connect them and run the automation from one screen.</p>{error&&<div className="error-panel">{error}</div>}<input value={name} onChange={e=>setName(e.target.value)} placeholder="Workflow name" required autoFocus/><button disabled={busy}><Plus size={16}/>{busy?'Creating…':'Create workflow'}</button></form></main>
}
