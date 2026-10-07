import { bucket, database, hash, json } from "./server";
import { IPA_MAX_SIZE_BYTES } from "./ipa-limits";

export type PendingInstall = { id: string; file_key: string; upload_token_hash: string; upload_id: string | null; expires_at: number; size: number; ready: number };

export async function pendingInstall(request: Request, id: string): Promise<PendingInstall | Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Upload from the signing page." }, 403);
  const row = await database().prepare("SELECT id,file_key,upload_token_hash,upload_id,expires_at,size,ready FROM installs WHERE id=?").bind(id).first<PendingInstall>();
  if (!row || row.ready || row.expires_at < Date.now() || row.size <= 0 || row.size > IPA_MAX_SIZE_BYTES || await hash(request.headers.get("X-Upload-Token") || "") !== row.upload_token_hash) return json({ error: "This upload link is invalid or has expired. Prepare a new link." }, 403);
  return row;
}

export async function finishInstall(request: Request, row: PendingInstall): Promise<Response> {
  const origin = new URL(request.url).origin;
  const stored = await bucket().head(row.file_key);
  if (!stored || stored.size !== row.size) {
    await bucket().delete(row.file_key);
    return json({ error: "The upload was interrupted. Please try again." }, 400);
  }
  await database().prepare("UPDATE installs SET ready=1,upload_token_hash='',upload_id=NULL WHERE id=?").bind(row.id).run();
  const manifestUrl = origin + "/install/" + row.id + "/manifest.plist";
  return json({ installUrl: "itms-services://?action=download-manifest&url=" + encodeURIComponent(manifestUrl), manifestUrl, pageUrl: origin + "/install/" + row.id, expiresAt: row.expires_at });
}

export async function cleanExpiredInstalls(now: number): Promise<void> {
  const db = database();
  const old = await db.prepare("SELECT id,file_key,upload_id FROM installs WHERE expires_at<? LIMIT 30").bind(now).all<{ id: string; file_key: string; upload_id: string | null }>();
  for (const row of old.results) {
    if (row.upload_id) {
      try { await bucket().resumeMultipartUpload(row.file_key, row.upload_id).abort(); }
      catch { console.error("An expired multipart upload could not be aborted; storage expiry will clear unfinished parts."); }
    }
    await bucket().delete(row.file_key);
    await db.prepare("DELETE FROM installs WHERE id=?").bind(row.id).run();
  }
}
