"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
export function InstallCountdown({expiresAt}:{expiresAt:number}) { const [remaining,setRemaining]=useState(""); useEffect(()=>{const update=()=>{const ms=Math.max(0,expiresAt-Date.now());setRemaining(ms?`${Math.floor(ms/3600000)}h ${Math.floor(ms%3600000/60000)}m remaining`:"Expired");};update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[expiresAt]);return <span className="expiry-countdown"><Clock3 size={15}/>{remaining}</span>; }
