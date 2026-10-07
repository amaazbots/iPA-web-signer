import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

type Runtime = { DB: D1Database; BUCKET: R2Bucket; ADMIN_PASSWORD?: string; ADMIN_SESSION_SECRET?: string; SITE_PUBLIC?: string; CERTIFICATE_IMPORT_TOKEN_HASH?: string; CERTIFICATE_IMPORT_EXPIRES_AT?: string; };
export function runtime(): Runtime { return env as unknown as Runtime; }
export function database() { const { DB } = runtime(); if (!DB) throw new Error("Database is unavailable. Please try again."); return DB; }
export function bucket() { const { BUCKET } = runtime(); if (!BUCKET) throw new Error("File storage is unavailable. Please try again."); return BUCKET; }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
async function adminToken() { const secret=runtime().ADMIN_SESSION_SECRET;if(!secret)return "";const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("amaazsign-admin-v1"));return Array.from(new Uint8Array(signature)).map(n=>n.toString(16).padStart(2,"0")).join(""); }
export async function isAdmin() { const token=(await cookies()).get("amaazsign_admin")?.value||"";const expected=await adminToken();return !!expected&&token===expected; }
export async function authenticateAdmin(password:string) { const configured=runtime().ADMIN_PASSWORD||"";if(!configured||await hash(password)!==await hash(configured))return null;return adminToken(); }
export async function requireAdmin(request: Request, mutating = true) { if (!await isAdmin()) return json({ error: "Only the site owner can make this change." }, 403); if (mutating && request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Open the owner dashboard to make this change." }, 403); return null; }
// Temporary, narrowly scoped service access for importing owner-supplied bundles.
// The platform's private-site gate remains required; this never authorizes other admin actions.
export async function mayImportCertificate(request: Request) {
  const config = runtime(); const token = request.headers.get("X-Certificate-Import-Token") || "";
  if (config.SITE_PUBLIC !== "false" || !config.CERTIFICATE_IMPORT_TOKEN_HASH || Date.parse(config.CERTIFICATE_IMPORT_EXPIRES_AT || "") <= Date.now() || !Number.isFinite(Date.parse(config.CERTIFICATE_IMPORT_EXPIRES_AT || "")) || token.length !== 64 || request.headers.get("origin") !== new URL(request.url).origin) return false;
  return await hash(token) === config.CERTIFICATE_IMPORT_TOKEN_HASH;
}
export async function hash(value: string) { const bytes = new TextEncoder().encode(value); return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(n => n.toString(16).padStart(2, "0")).join(""); }
export function xml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
export async function guarded(work: () => Promise<Response>) { try { return await work(); } catch (error) { console.error("AmaazSign request failed", error instanceof Error ? error.message : "Unknown error"); return json({ error: "This request couldn’t be completed. Your files are still on your device. Please try again." }, 503); } }
