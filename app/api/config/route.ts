import { database, guarded, isAdmin, json, runtime } from "@/lib/server";
import { normalizeAdSettings } from "@/lib/types";
export async function GET() { return guarded(async () => {
  const db = database();
  const certs = await db.prepare("SELECT id,name,notes,enabled,status,expires_at,team_id,profile_type,created_at FROM certificates WHERE enabled=1 ORDER BY created_at DESC").all();
  const adRow = await db.prepare("SELECT value FROM settings WHERE key=?").bind("ads").first<{ value: string }>();
  return json({ certificates: certs.results, ads: normalizeAdSettings(adRow ? JSON.parse(adRow.value) : null), canManage: await isAdmin(), publicInstall: runtime().SITE_PUBLIC !== "false" });
}); }
