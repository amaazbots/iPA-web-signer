import { database, guarded, hash, json } from "@/lib/server";

async function ensureTable() { await database().prepare("CREATE TABLE IF NOT EXISTS certificate_reports (id TEXT PRIMARY KEY,certificate_id TEXT NOT NULL,result TEXT NOT NULL,client_hash TEXT NOT NULL,created_at INTEGER NOT NULL)").run(); }

export async function GET() { return guarded(async () => {
  await ensureTable(); const since=Date.now()-7*86400000;
  const rows=await database().prepare("SELECT certificate_id,result,COUNT(*) count FROM certificate_reports WHERE created_at>? GROUP BY certificate_id,result").bind(since).all<{certificate_id:string;result:string;count:number}>();
  const reports:Record<string,Record<string,number>>={}; for(const row of rows.results){reports[row.certificate_id]||={};reports[row.certificate_id][row.result]=row.count;}
  return json({reports,windowDays:7});
}); }

export async function POST(request:Request) { return guarded(async () => {
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Send reports from AmaazSign."},403);
  const body=await request.json() as {certificateId?:string;result?:string};
  if(!/^[0-9a-f-]{36}$/.test(body.certificateId||"")||!["working","failed","revoked"].includes(body.result||""))return json({error:"Choose a valid report."},400);
  await ensureTable(); const db=database(); const clientHash=await hash(request.headers.get("cf-connecting-ip")||"local-preview"); const since=Date.now()-6*3600000;
  const recent=await db.prepare("SELECT COUNT(*) count FROM certificate_reports WHERE certificate_id=? AND client_hash=? AND created_at>?").bind(body.certificateId,clientHash,since).first<{count:number}>();
  if((recent?.count||0)>=1)return json({error:"You already reported this certificate recently."},429);
  await db.prepare("INSERT INTO certificate_reports (id,certificate_id,result,client_hash,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),body.certificateId,body.result,clientHash,Date.now()).run();
  return json({ok:true},201);
}); }
