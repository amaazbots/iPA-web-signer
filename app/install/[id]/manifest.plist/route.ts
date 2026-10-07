import { bucket, database, guarded, json, xml } from "@/lib/server";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) { return guarded(async()=>{
 const {id}=await params; const row=await database().prepare("SELECT bundle_id,title,version,file_key,expires_at FROM installs WHERE id=? AND ready=1").bind(id).first<{bundle_id:string;title:string;version:string;file_key:string;expires_at:number}>();
 if(!row)return json({error:"Installation not found."},404); if(row.expires_at<Date.now()){await bucket().delete(row.file_key); return json({error:"This installation link has expired."},410);}
 const ipaUrl=new URL(request.url).origin+"/install/"+id+"/app.ipa";
 const content='<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>items</key><array><dict><key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>'+xml(ipaUrl)+'</string></dict></array><key>metadata</key><dict><key>bundle-identifier</key><string>'+xml(row.bundle_id)+'</string><key>bundle-version</key><string>'+xml(row.version)+'</string><key>kind</key><string>software</string><key>title</key><string>'+xml(row.title)+'</string></dict></dict></array></dict></plist>';
 return new Response(content,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }); }
