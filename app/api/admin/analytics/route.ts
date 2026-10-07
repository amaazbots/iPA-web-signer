import { database, guarded, json, requireAdmin } from "@/lib/server";
import { cleanExpiredInstalls } from "@/lib/install-upload";

export async function GET(request: Request) { return guarded(async () => {
  const denied = await requireAdmin(request, false); if (denied) return denied;
  const db = database(); const now = Date.now();
  const [day, week, active, storage, topApps, limited] = await Promise.all([
    db.prepare("SELECT COUNT(*) count FROM installs WHERE created_at>?").bind(now-86400000).first<{count:number}>(),
    db.prepare("SELECT COUNT(*) count FROM installs WHERE created_at>?").bind(now-7*86400000).first<{count:number}>(),
    db.prepare("SELECT COUNT(*) count FROM installs WHERE ready=1 AND expires_at>?").bind(now).first<{count:number}>(),
    db.prepare("SELECT COALESCE(SUM(size),0) bytes FROM installs WHERE ready=1 AND expires_at>?").bind(now).first<{bytes:number}>(),
    db.prepare("SELECT title,COUNT(*) count FROM installs WHERE created_at>? GROUP BY title ORDER BY count DESC LIMIT 5").bind(now-7*86400000).all<{title:string;count:number}>(),
    db.prepare("SELECT COUNT(*) count FROM (SELECT client_hash FROM installs WHERE created_at>? GROUP BY client_hash HAVING COUNT(*)>=5)").bind(now-3600000).first<{count:number}>(),
  ]);
  return json({ day:day?.count||0, week:week?.count||0, active:active?.count||0, storageBytes:storage?.bytes||0, limitedClients:limited?.count||0, topApps:topApps.results });
}); }

export async function POST(request: Request) { return guarded(async () => {
  const denied = await requireAdmin(request); if (denied) return denied;
  return json({ removed: await cleanExpiredInstalls(Date.now(), 20) });
}); }
