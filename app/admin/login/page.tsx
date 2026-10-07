"use client";
import { useState } from "react";
import { LoaderCircle,LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function AdminLogin(){
 const [password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const body=await response.json() as {error?:string};if(!response.ok)throw new Error(body.error||"Sign-in failed.");location.href="/admin";}catch(reason){setError(reason instanceof Error?reason.message:"Sign-in failed.");setBusy(false);}}
 return <><SiteHeader active="manage"/><main className="document-main"><section className="panel admin-login"><div className="install-icon"><LockKeyhole size={36}/></div><span className="eyebrow">OWNER ACCESS</span><h1>Manage AmaazSign.</h1><p>Enter the admin password configured during deployment.</p><form onSubmit={submit}><label className="form-label">Admin password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="primary-button" disabled={busy||!password}>{busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {busy?"Signing in…":"Open dashboard"}</button></form>{error&&<div className="notice error" role="alert">{error}</div>}</section></main><SiteFooter/></>;
}
