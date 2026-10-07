import { unzipSync } from "fflate";
import { readPlist } from "./plist";
import { inspectProfile, resolveBundleId, signingEntitlements } from "./profile";
import type { AppMetadata } from "./types";
import { IPA_MAX_SIZE_BYTES, IPA_MAX_SIZE_MB, IPA_MAX_ENTRY_BYTES, IPA_MAX_UNPACKED_BYTES } from "./ipa-limits";

export async function checkArchive(file: File) {
 if(!file.size || file.size>IPA_MAX_SIZE_BYTES)throw new Error(`Choose an IPA up to ${IPA_MAX_SIZE_MB} MB.`);
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());const view=new DataView(tail.buffer);let eocd=-1;
 for(let i=tail.length-22;i>=0;i--){if(view.getUint32(i,true)===0x06054b50 && i+22+view.getUint16(i+20,true)===tail.length){eocd=i;break;}}
 if(eocd<0)throw new Error("This file isn’t a readable IPA archive.");
 const count=view.getUint16(eocd+10,true),size=view.getUint32(eocd+12,true),offset=view.getUint32(eocd+16,true);
 if(count===65535||size===0xffffffff||offset===0xffffffff)throw new Error("ZIP64 archives aren’t supported. Export a standard IPA.");
 if(count>15000||size>8*1024*1024||offset+size>file.size)throw new Error("The archive has too many files or an invalid directory.");
 const directory=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer());const dv=new DataView(directory.buffer);let pos=0,total=0,needsBundleCleanup=false;const names=new Set<string>(),roots=new Set<string>();
 for(let i=0;i<count;i++){if(pos+46>directory.length||dv.getUint32(pos,true)!==0x02014b50)throw new Error("The IPA directory is damaged.");const flags=dv.getUint16(pos+8,true),unpacked=dv.getUint32(pos+24,true),nameLen=dv.getUint16(pos+28,true),extra=dv.getUint16(pos+30,true),comment=dv.getUint16(pos+32,true);
  if(pos+46+nameLen+extra+comment>directory.length || flags&1)throw new Error("Encrypted or damaged ZIP archives aren’t supported.");
  const name=new TextDecoder().decode(directory.subarray(pos+46,pos+46+nameLen));if(!name||name.startsWith("/")||name.includes("\\")||name.split("/").some(p=>p===".."||p===".")||names.has(name)||name.includes("\0"))throw new Error("The IPA contains unsafe or duplicate paths.");names.add(name);
  const root=name.match(/^Payload\/([^/]+\.app)\//);if(root)roots.add("Payload/"+root[1]+"/");
  if(/\.(?:appex|app)\//i.test(name.replace(/^Payload\/[^/]+\.app\//,"")))needsBundleCleanup=true;
  total+=unpacked;if(unpacked>IPA_MAX_ENTRY_BYTES||total>IPA_MAX_UNPACKED_BYTES)throw new Error("This IPA needs too much browser memory. Try a smaller IPA.");pos+=46+nameLen+extra+comment;
 }
 if(roots.size!==1)throw new Error("Choose an IPA containing one main app in Payload.");return {root:[...roots][0],names,needsBundleCleanup};
}

export async function getMetadata(file:File,profile:Uint8Array,matchProfile=false):Promise<AppMetadata>{
 const {root,needsBundleCleanup}=await checkArchive(file);const data=new Uint8Array(await file.arrayBuffer());const plists=unzipSync(data,{filter:entry=>entry.name===root+"Info.plist" && entry.originalSize<=2*1024*1024});const infoBytes=plists[root+"Info.plist"];
 if(!infoBytes)throw new Error("This IPA is missing its Info.plist.");const info=readPlist(infoBytes);const bundleId=String(info.CFBundleIdentifier || "");const title=String(info.CFBundleDisplayName || info.CFBundleName || file.name.replace(/\.ipa$/i,""));const version=String(info.CFBundleVersion || info.CFBundleShortVersionString || "1.0");
 if(!/^[A-Za-z0-9._-]{1,255}$/.test(bundleId))throw new Error("This IPA has an invalid bundle identifier.");
 const profileInfo=inspectProfile(profile);const signingBundleId=resolveBundleId(profileInfo,bundleId,matchProfile);
 return{bundleId:signingBundleId,...(signingBundleId!==bundleId?{originalBundleId:bundleId}:{}),title:title.slice(0,150),version:version.slice(0,40),profileType:profileInfo.profileType,...(needsBundleCleanup?{needsBundleCleanup:true}:{})};
}

export async function runSigning(ipa:File,p12:File,profile:File,password:string,bundleId:string,onLog:(line:string)=>void,signal:AbortSignal,needsBundleCleanup=false):Promise<Blob>{
 const entitlements=signingEntitlements(new Uint8Array(await profile.arrayBuffer()),bundleId);
 return new Promise((resolve,reject)=>{
  const worker=new Worker("/signing-worker.js");let settled=false;const stop=()=>{worker.terminate();signal.removeEventListener("abort",cancel);};const cancel=()=>{if(settled)return;settled=true;stop();reject(new Error("Signing cancelled. Your files haven’t been uploaded."));};signal.addEventListener("abort",cancel,{once:true});if(signal.aborted){cancel();return;}
  worker.onerror=()=>{if(settled)return;settled=true;stop();reject(new Error("The browser ran out of memory or couldn’t load the signing engine. Try a smaller IPA or a desktop browser."));};
  worker.onmessage=e=>{const message=e.data;if(message.type==="log"){onLog(message.line);return;}if(message.type!=="done"||settled)return;settled=true;stop();
   if(!message.ok){const detail=String(message.error||"").split("\n")[0].replace(/^Error:\s*/,"").slice(0,300);reject(new Error(detail?`The signing engine couldn’t finish: ${detail}`:"The signing engine couldn’t finish. Refresh the page and try again."));return;}const result=message.result;const output=result.outputs.find((o:{path:string})=>o.path==="/output/signed.ipa");
   if(result.logs.some((line:string)=>/unknown issuer hash/i.test(line))){reject(new Error("The .p12 is missing its certificate chain or uses an unsupported issuer. Export the full Apple signing certificate chain and try again."));return;}
   if(result.exitCode!==0||!output?.data?.byteLength){const detail=result.logs.map((line:string)=>line.replace(/\x1b\[[0-9;]*m/g,"")).findLast((line:string)=>/failed|error|invalid|password/i.test(line));reject(new Error(detail || "Signing failed. Check the certificate password and provisioning profile."));return;}
   const blob=new Blob([output.data],{type:"application/octet-stream"});resolve(blob);
  };
  worker.postMessage({id:"sign",type:"run",files:[{path:"/blob/input.ipa",mode:"workerfs",file:ipa},{path:"/blob/cert.p12",mode:"workerfs",file:p12},{path:"/blob/profile.mobileprovision",mode:"workerfs",file:profile},{path:"/blob/entitlements.plist",mode:"workerfs",file:entitlements}],args:["-k","/blob/cert.p12","-p",password,"-m","/blob/profile.mobileprovision","-b",bundleId,"-e","/blob/entitlements.plist",...(needsBundleCleanup?["-E","-W"]:[]),"-f","-z","1","-o","/output/signed.ipa","/blob/input.ipa"],options:{outputPaths:["/output/signed.ipa"]}});
 });
}
