import { json } from "@/lib/server";
export async function POST(request:Request){if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Open the owner dashboard to sign out."},403);const response=json({ok:true});response.headers.append("Set-Cookie","amaazsign_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");return response;}
