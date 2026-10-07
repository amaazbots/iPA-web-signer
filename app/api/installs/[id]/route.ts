import { bucket, guarded, json } from "@/lib/server";
import { finishInstall, pendingInstall } from "@/lib/install-upload";
import { IPA_SINGLE_UPLOAD_BYTES, IPA_UPLOAD_PART_BYTES } from "@/lib/ipa-limits";
export async function PUT(request: Request, { params }: { params: Promise<{ id:string }> }) { return guarded(async () => {
  const { id }=await params; const row=await pendingInstall(request, id); if (row instanceof Response) return row;
  const length=Number(request.headers.get("content-length"));
  if (row.upload_id) {
    const partNumber = Number(request.headers.get("X-Upload-Part"));
    const partCount = Math.ceil(row.size / IPA_UPLOAD_PART_BYTES);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) return json({ error: "This upload part is invalid." }, 400);
    const expected = Math.min(IPA_UPLOAD_PART_BYTES, row.size - (partNumber - 1) * IPA_UPLOAD_PART_BYTES);
    if (!request.body || length !== expected) return json({ error: "The upload part size doesn’t match your signed file." }, 400);
    const part = await bucket().resumeMultipartUpload(row.file_key, row.upload_id).uploadPart(partNumber, request.body);
    return json({ partNumber: part.partNumber, etag: part.etag });
  }
  if (row.size > IPA_SINGLE_UPLOAD_BYTES) return json({ error: "Prepare a new installation link to upload this larger file." }, 400);
  if (!request.body || !Number.isFinite(length) || length!==row.size) return json({ error: "The upload size doesn’t match your signed file." }, 400);
  await bucket().put(row.file_key,request.body,{ httpMetadata:{ contentType:"application/octet-stream",contentDisposition:'attachment; filename="signed.ipa"' } });
  return finishInstall(request,row);
}); }

export async function POST(request: Request, { params }: { params: Promise<{ id:string }> }) { return guarded(async () => {
  const { id } = await params; const row = await pendingInstall(request, id); if (row instanceof Response) return row;
  if (!row.upload_id) return json({ error: "This upload does not need multipart completion." }, 400);
  if (Number(request.headers.get("content-length") || 0) > 8192) return json({ error: "Upload completion data is too large." }, 413);
  const body = await request.json() as { parts?: unknown } | null;
  const parts = body?.parts;
  const count = Math.ceil(row.size / IPA_UPLOAD_PART_BYTES);
  if (!Array.isArray(parts) || parts.length !== count || parts.some((part, index) => !part || part.partNumber !== index + 1 || typeof part.etag !== "string" || !part.etag || part.etag.length > 200)) return json({ error: "The upload is incomplete. Please try again." }, 400);
  await bucket().resumeMultipartUpload(row.file_key, row.upload_id).complete(parts.map(part => ({ partNumber: part.partNumber, etag: part.etag })));
  return finishInstall(request,row);
}); }
