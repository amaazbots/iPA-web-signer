import { database, guarded, json, requireAdmin } from "@/lib/server";
import { normalizeAdSettings, type AdPlacement, type AdSettings } from "@/lib/types";

function readPlacement(value: unknown): AdPlacement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { enabled, provider, html } = value as Record<string, unknown>;
  if (typeof enabled !== "boolean" || typeof html !== "string" || html.length > 50000 || typeof provider !== "string" || provider.length > 80 || (enabled && !html.trim())) return null;
  return { enabled, provider, html };
}

export async function PUT(request: Request) {
  return guarded(async () => {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const body: unknown = await request.json();
    const sidebar = readPlacement(body);
    if (!sidebar) return json({ error: "Add valid banner embed code before enabling a placement." }, 400);
    const input = body as Record<string, unknown>;
    const db = database();
    let result: AdPlacement | null;
    if ("result" in input) {
      result = readPlacement(input.result);
    } else {
      // Older clients can still update the sidebar without replacing the result banner.
      const row = await db.prepare("SELECT value FROM settings WHERE key=?").bind("ads").first<{ value: string }>();
      result = normalizeAdSettings(row ? JSON.parse(row.value) : null).result;
    }
    if (!result) return json({ error: "Add valid banner embed code before enabling a placement." }, 400);
    const settings: AdSettings = { ...sidebar, result };
    await db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind("ads", JSON.stringify(settings)).run();
    return json({ ok: true });
  });
}
