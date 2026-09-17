'use client';
import {FormEvent,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,UserPlus} from 'lucide-react';
import {Logo} from '../../components/Logo';
import {sb,setSession} from '../../lib/switchboard';

export default function Signup(){
  const router=useRouter();
  const[name,setName]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      const r=await sb<any>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password}),auth:false} as any);
      setSession(r.token,r.user);
      router.replace('/dashboard');
    }catch(e:any){setError(e.message||'Unable to create account')}
    finally{setBusy(false)}
  }

  return <main className="auth-page"><div className="auth-orb auth-orb-a"/><div className="auth-orb auth-orb-b"/><Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to overview</Link><section className="auth-grid"><div className="auth-copy"><Logo size={62}/><p className="eyebrow">SWITCHBOARD ACCESS</p><h1>Create your workspace account.</h1><p>New accounts are created as Operators. Administrator access remains restricted to the platform admin.</p></div><form className="auth-card liquid-glass" onSubmit={submit}><div><span className="eyebrow">CREATE ACCOUNT</span><h2>Sign up</h2><p>Use an email and a password of at least 10 characters.</p></div><label>Name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} autoComplete="name"/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} autoComplete="new-password" placeholder="At least 10 characters"/></label>{error&&<div className="login-error">{error}</div>}<button className="primary-btn auth-submit" disabled={busy}><UserPlus size={16}/>{busy?'Creating account…':'Create account'}</button><small className="auth-note">Already registered? <Link href="/login">Sign in</Link></small></form></section></main>;
}
