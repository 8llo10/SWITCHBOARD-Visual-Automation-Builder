'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {AlertCircle,CheckCircle2,ChevronRight,Clock3,Loader2,RefreshCw} from 'lucide-react';
import {sb} from '../lib/switchboard';
import {EmptyState} from './Shell';

export function Badge({value}:{value:any}){const v=String(value??'—');const kind=/SUCCEEDED|ACTIVE|ADMIN|connected|true/i.test(v)?'good':/FAILED|CANCELLED|ARCHIVED|false/i.test(v)?'bad':/WAITING|QUEUED|DRAFT|OPERATOR/i.test(v)?'warn':'neutral';return <span className={`badge ${kind}`}>{v}</span>}

export function DataTable({rows,columns,href}:{rows:any[];columns:{key:string;label:string;render?:(row:any)=>React.ReactNode}[];href?:(row:any)=>string}){
  if(!rows.length)return <EmptyState title="Nothing here yet" body="This module is ready. Create or execute something and it will appear here."/>;
  return <div className="table-card"><div className="table-scroll"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}{href&&<th/>}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(row):String(row[c.key]??'—')}</td>)}{href&&<td className="row-link"><Link href={href(row)}><ChevronRight size={16}/></Link></td>}</tr>)}</tbody></table></div></div>
}

export function RemoteData({endpoint,children,emptyTitle}:{endpoint:string;children:(data:any)=>React.ReactNode;emptyTitle?:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[more,setMore]=useState(true),[loadingMore,setLoadingMore]=useState(false);
 const load=async()=>{setLoading(true);setError('');try{const rows=await sb<any[]>(endpoint);setData(rows);setMore(rows.length>=Number(new URLSearchParams(endpoint.split('?')[1]||'').get('limit')||50))}catch(e:any){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{void load()},[endpoint]);
 if(loading)return <div className="loading-panel"><Loader2 className="spin"/> Loading live data…</div>;
 if(error)return <div className="error-panel"><AlertCircle size={18}/><div><strong>Could not load data</strong><p>{error}</p></div><button onClick={load}><RefreshCw size={15}/> Retry</button></div>;
 if(Array.isArray(data)&&!data.length)return <EmptyState title={emptyTitle||'No records yet'} body="The backend is connected and this module is empty."/>;
 const loadMore=async()=>{if(!Array.isArray(data)||!data.length)return;setLoadingMore(true);try{const url=new URL(endpoint,'https://local');url.searchParams.set('cursor',data.at(-1).id);const rows=await sb<any[]>(url.pathname+url.search);setData((old:any[])=>[...old,...rows.filter(row=>!old.some(x=>x.id===row.id))]);setMore(rows.length>=Number(url.searchParams.get('limit')||50))}catch(e){setError(e instanceof Error?e.message:'Could not load more')}finally{setLoadingMore(false)}};
 return <>{children(data)}{Array.isArray(data)&&more&&<button className="table-action" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?'Loading…':'Load more'}</button>}</>;
}

export function Metric({label,value,sub,icon}:{label:string;value:any;sub?:string;icon?:React.ReactNode}){return <div className="metric-card"><div className="metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
export const formatDate=(v:any)=>v?new Date(v).toLocaleString(): '—';
