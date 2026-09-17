'use client';
import {FormEvent,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,LockKeyhole,ShieldCheck} from 'lucide-react';
import {Logo} from '../../components/Logo';
import {sb,setSession} from '../../lib/switchboard';

export default function Login(){
  const router=useRouter();
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{const r=await sb<any>('/auth/login',{method:'POST',body:JSON.stringify({email,password}),auth:false} as any);setSession(r.token,r.user);router.replace('/dashboard')}
    catch(e:any){setError(e?.message||'Unable to sign in. Check your credentials and try again.')}
    finally{setBusy(false)}
  }
  return <main className="auth-page"><div className="auth-orb auth-orb-a"/><div className="auth-orb auth-orb-b"/><Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to overview</Link><section className="auth-grid"><div className="auth-copy"><Logo size={62}/><p className="eyebrow">SWITCHBOARD CONTROL PLANE</p><h1>One place to design, execute and govern IT automation.</h1><p>Secure access to workflows, run history, credentials, triggers, directory operations and audit events.</p><div className="auth-points"><span><ShieldCheck/> Role-based access control</span><span><LockKeyhole/> Encrypted credential storage</span></div></div><form className="auth-card liquid-glass" onSubmit={submit}><div><span className="eyebrow">SECURE ACCESS</span><h2>Sign in</h2><p>Use your SWITCHBOARD platform account.</p></div><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password"/></label>{error&&<div className="login-error">{error}</div>}<button className="primary-btn auth-submit" disabled={busy}><LockKeyhole size={16}/>{busy?'Authenticating…':'Enter control plane'}</button><small className="auth-note">New to SWITCHBOARD? <Link href="/signup">Create an account</Link></small></form></section></main>;
}
