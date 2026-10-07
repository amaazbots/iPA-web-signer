import { authenticateAdmin,guarded,json } from "@/lib/server";

export async function POST(request:Request){return guarded(async()=>{
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Open the AmaazSign admin page to sign in."},403);
 const body=await request.json() as {password?:string};if(typeof body.password!=="string"||body.password.length>500)return json({error:"Enter your admin password."},400);
 const token=await authenticateAdmin(body.password);if(!token)return json({error:"Incorrect admin password."},401);
 const response=json({ok:true});response.headers.append("Set-Cookie",`amaazsign_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);return response;
});}
