'use client';
import {KeyValueFields} from './RequestFields';

export function PayloadEditor({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 let parsed:Record<string,unknown>={};
 let valid=true;
 try { const result=JSON.parse(value); if(!result||Array.isArray(result)||typeof result!=='object')valid=false;else parsed=result; } catch { valid=false; }
 const scalars=Object.fromEntries(Object.entries(parsed).filter(([,v])=>v===null||typeof v!=='object').map(([key,v])=>[key,String(v??'')]));
 return <>
  {valid&&<KeyValueFields label="Test input" value={scalars} onChange={fields=>{const nested=Object.fromEntries(Object.entries(parsed).filter(([,v])=>v!==null&&typeof v==='object'));onChange(JSON.stringify({...nested,...fields},null,2))}}/>}
  <details className="payload-advanced"><summary>Advanced JSON and input preview</summary><label className="n8n-field"><span>Input JSON</span><textarea className="payload-editor" value={value} onChange={e=>onChange(e.target.value)}/></label></details>
  {!valid&&<p role="alert">Enter a JSON object in Advanced JSON.</p>}
 </>;
}
