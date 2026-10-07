import { bucket, database, guarded, json } from "@/lib/server";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {return guarded(async()=>{
 const {id}=await params; const row=await database().prepare("SELECT file_key,expires_at FROM installs WHERE id=? AND ready=1").bind(id).first<{file_key:string;expires_at:number}>();
 if(!row)return json({error:"File not found."},404); if(row.expires_at<Date.now()){await bucket().delete(row.file_key); return json({error:"This file has expired."},410);}
 const object=await bucket().get(row.file_key,{range:request.headers}); if(!object)return json({error:"File not found."},404);
 const headers=new Headers({"Content-Type":"application/octet-stream","Content-Disposition":'attachment; filename="signed.ipa"',"Cache-Control":"private, max-age=0","Accept-Ranges":"bytes","X-Content-Type-Options":"nosniff"});
 if(request.headers.has("range") && object.range){const range=object.range;const offset="offset" in range ? (range.offset || 0) : "suffix" in range ? Math.max(0,object.size-range.suffix) : 0;const length="length" in range ? (range.length || object.size-offset) : object.size-offset;headers.set("Content-Range","bytes "+offset+"-"+(offset+length-1)+"/"+object.size);headers.set("Content-Length",String(length));return new Response(object.body,{status:206,headers});}
 headers.set("Content-Length",String(object.size));return new Response(object.body,{headers});
 });}
