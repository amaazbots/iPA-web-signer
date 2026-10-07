import { bucket, database, guarded, json } from "@/lib/server";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { return guarded(async () => {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Certificate not found." }, 404);
  const cert = await database().prepare("SELECT password,status,expires_at FROM certificates WHERE id=? AND enabled=1").bind(id).first<{ password: string; status: string; expires_at: string | null }>();
  if (!cert || cert.status === "revoked" || (cert.expires_at && Date.parse(cert.expires_at) <= Date.now())) return json({ error: "This certificate is unavailable. Choose a different certificate." }, 409);
  const store = bucket(); const [p12, profile] = await Promise.all([store.get("certificates/" + id + "/certificate.p12"), store.get("certificates/" + id + "/profile.mobileprovision")]);
  if (!p12 || !profile) return json({ error: "Certificate files are unavailable." }, 503);
  const encode = async (object: R2ObjectBody) => { const bytes = new Uint8Array(await object.arrayBuffer()); let s = ""; for (let i=0;i<bytes.length;i+=16384) s += String.fromCharCode(...bytes.subarray(i,i+16384)); return btoa(s); };
  return json({ p12: await encode(p12), profile: await encode(profile), password: cert.password });
}); }
