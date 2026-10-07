import { bucket, database, guarded, hash, json, runtime } from "@/lib/server";
import { IPA_MAX_SIZE_BYTES, IPA_MAX_SIZE_MB, IPA_SINGLE_UPLOAD_BYTES, IPA_UPLOAD_PART_BYTES } from "@/lib/ipa-limits";
import { cleanExpiredInstalls } from "@/lib/install-upload";
export async function POST(request: Request) { return guarded(async () => {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Prepare the installation link from the signing page." }, 403);
  if (runtime().SITE_PUBLIC === "false") return json({ error: "Direct installation needs a public website. You can download your signed IPA now; the owner must make the site public to enable install links." }, 409);
  const body = await request.json() as { bundleId: string; title: string; version: string; size: number; profileType: string };
  if (!Number.isInteger(body.size) || body.size <= 0 || body.size > IPA_MAX_SIZE_BYTES) return json({ error: `Installation links support signed IPAs up to ${IPA_MAX_SIZE_MB} MB.` }, 400);
  if (!/^[A-Za-z0-9._-]{1,255}$/.test(body.bundleId || "") || !body.title || body.title.length > 150 || !/^[A-Za-z0-9._-]{1,40}$/.test(body.version || "") || !["enterprise", "adhoc"].includes(body.profileType)) return json({ error: "This app or profile is not suitable for a direct installation link. Download the signed IPA instead." }, 400);
  const db=database(); const now=Date.now(); const clientHash=await hash(request.headers.get("cf-connecting-ip") || "local-preview");
  const usage=await db.prepare("SELECT COUNT(*) AS count FROM installs WHERE client_hash=? AND created_at>?").bind(clientHash,now-3600000).first<{ count:number }>();
  if ((usage?.count || 0)>=5) return json({ error: "You’ve prepared five install links this hour. Download your IPA or try again later." }, 429);
  await cleanExpiredInstalls(now);
  const id=crypto.randomUUID(); const uploadToken=crypto.randomUUID()+crypto.randomUUID(); const fileKey="installs/"+id+".ipa"; const expiresAt=now+24*3600000;
  const multipart = body.size > IPA_SINGLE_UPLOAD_BYTES ? await bucket().createMultipartUpload(fileKey, { httpMetadata: { contentType: "application/octet-stream", contentDisposition: 'attachment; filename="signed.ipa"' } }) : null;
  try {
    await db.prepare("INSERT INTO installs (id,upload_token_hash,file_key,upload_id,bundle_id,title,version,size,ready,expires_at,client_hash,created_at) VALUES (?,?,?,?,?,?,?,?,0,?,?,?)").bind(id,await hash(uploadToken),fileKey,multipart?.uploadId || null,body.bundleId,body.title,body.version,body.size,expiresAt,clientHash,now).run();
  } catch (error) {
    if (multipart) { try { await multipart.abort(); } catch { console.error("An unused multipart upload could not be aborted."); } }
    throw error;
  }
  return json({ id, uploadToken, expiresAt, ...(multipart ? { chunkSize: IPA_UPLOAD_PART_BYTES } : {}) }, 201);
}); }
