'use client';
import Image from 'next/image';

export function Logo({size=38,wordmark=true}:{size?:number;wordmark?:boolean}){
  return <div className="brand-mark"><Image src="/switchboard-logo.webp" alt="SWITCHBOARD" width={size} height={size} priority/><span className={wordmark?'brand-word':'sr-only'}>SWITCHBOARD</span></div>;
}
