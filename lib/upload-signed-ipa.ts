import { IPA_UPLOAD_PART_BYTES } from "./ipa-limits";

export type InstallLink = { installUrl: string; pageUrl: string; expiresAt: number };
export type UploadSlot = { id: string; uploadToken: string; chunkSize?: number };

export async function uploadSignedIpa(blob: Blob, slot: UploadSlot, onProgress: (percent: number) => void, onRequest: (xhr: XMLHttpRequest | null) => void): Promise<InstallLink> {
  const endpoint = "/api/installs/" + slot.id;
  function send<T>(piece: Blob, offset: number, partNumber?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); onRequest(xhr);
      xhr.open("PUT", endpoint);
      xhr.setRequestHeader("X-Upload-Token", slot.uploadToken);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      if (partNumber) xhr.setRequestHeader("X-Upload-Part", String(partNumber));
      xhr.timeout = 300000;
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.round((offset + event.loaded) / blob.size * 100))); };
      xhr.onload = () => {
        onRequest(null);
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || "Upload failed. Please try again."));
        } catch { reject(new Error("The upload couldn’t finish. Try again.")); }
      };
      xhr.onerror = () => { onRequest(null); reject(new Error("The upload was interrupted. Your signed IPA is still available to download.")); };
      xhr.ontimeout = () => { onRequest(null); reject(new Error("Upload timed out. Try again on a faster connection.")); };
      xhr.onabort = () => { onRequest(null); reject(new Error("Upload cancelled.")); };
      xhr.send(piece);
    });
  }
  if (slot.chunkSize === undefined) {
    const installed = await send<InstallLink>(blob, 0); onProgress(100); return installed;
  }
  if (slot.chunkSize !== IPA_UPLOAD_PART_BYTES) throw new Error("This installation upload is invalid. Prepare a new link.");
  const parts: { partNumber: number; etag: string }[] = [];
  for (let offset = 0; offset < blob.size; offset += slot.chunkSize) {
    const partNumber = parts.length + 1;
    const piece = blob.slice(offset, Math.min(blob.size, offset + slot.chunkSize));
    const part = await send<{ partNumber: number; etag: string }>(piece, offset, partNumber);
    if (part.partNumber !== partNumber || typeof part.etag !== "string" || !part.etag) throw new Error("An upload part couldn’t be confirmed. Please try again.");
    parts.push(part); onProgress(Math.min(99, Math.round((offset + piece.size) / blob.size * 100)));
  }
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "X-Upload-Token": slot.uploadToken }, body: JSON.stringify({ parts }) });
  const installed = await response.json() as InstallLink & { error?: string };
  if (!response.ok) throw new Error(installed.error || "The install link couldn’t be prepared.");
  onProgress(100); return installed;
}
