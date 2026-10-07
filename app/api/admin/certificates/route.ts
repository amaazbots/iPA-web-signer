import { bucket, database, guarded, json, mayImportCertificate, requireAdmin } from "@/lib/server";
import { inspectProfile } from "@/lib/profile";
export async function GET(request: Request) { return guarded(async () => { const denied = await requireAdmin(request, false); if (denied) return denied; return json({ certificates: (await database().prepare("SELECT id,name,notes,enabled,status,expires_at,team_id,profile_type,created_at FROM certificates ORDER BY created_at DESC").all()).results }); }); }
export async function POST(request: Request) { return guarded(async () => {
  const denied = await requireAdmin(request); if (denied && !await mayImportCertificate(request)) return denied;
  if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024) return json({ error: "Certificate files are too large." }, 413);
  const form = await request.formData(); const p12 = form.get("p12"); const profile = form.get("profile");
  const name = String(form.get("name") || "").trim(); const password = String(form.get("password") || ""); const notes = String(form.get("notes") || "").trim();
  if (!(p12 instanceof File) || !(profile instanceof File) || !name || name.length > 120 || notes.length > 1000 || password.length > 1000 || form.get("shareConfirmed") !== "true") return json({ error: "Add a name, both files, and confirm these files may be shared with visitors." }, 400);
  if (!p12.size || !profile.size || p12.size > 4 * 1024 * 1024 || profile.size > 1024 * 1024 || !/\.(p12|pfx)$/i.test(p12.name) || !/\.mobileprovision$/i.test(profile.name)) return json({ error: "Use a .p12 (up to 4 MB) and .mobileprovision (up to 1 MB)." }, 400);
  const count = await database().prepare("SELECT COUNT(*) AS count FROM certificates").first<{ count: number }>(); if ((count?.count || 0) >= 50) return json({ error: "Remove an old certificate before adding another. The limit is 50." }, 400);
  let details; try { details = inspectProfile(new Uint8Array(await profile.arrayBuffer())); } catch (error) { return json({ error: error instanceof Error ? error.message : "The profile could not be read." }, 400); }
  const expiresAt = details.expiresAt; const profileType = details.profileType;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) return json({ error: "This provisioning profile has expired." }, 400);
  const teamId = details.teamId; const id = crypto.randomUUID(); const store = bucket();
  await store.put("certificates/" + id + "/certificate.p12", p12.stream()); await store.put("certificates/" + id + "/profile.mobileprovision", profile.stream());
  try { await database().prepare("INSERT INTO certificates (id,name,notes,password,enabled,status,expires_at,team_id,profile_type,created_at) VALUES (?,?,?,?,1,'unverified',?,?,?,?)").bind(id,name,notes,password,expiresAt,teamId,profileType,Date.now()).run(); }
  catch (error) { await store.delete(["certificates/"+id+"/certificate.p12", "certificates/"+id+"/profile.mobileprovision"]); throw error; }
  return json({ id }, 201);
}); }
