import { database, guarded, json } from "@/lib/server";
import { normalizeAdSettings } from "@/lib/types";

export async function GET(request: Request) {
  return guarded(async () => {
    const slot = new URL(request.url).searchParams.get("slot") || "sidebar";
    if (slot !== "sidebar" && slot !== "result") return json({ error: "Unknown ad placement." }, 400);
    const row = await database().prepare("SELECT value FROM settings WHERE key=?").bind("ads").first<{ value: string }>();
    const ads = normalizeAdSettings(row ? JSON.parse(row.value) : null);
    const placement = slot === "result" ? ads.result : ads;
    const height = slot === "result" ? 100 : 250;
    let content = placement.enabled ? placement.html : "";
    // Keep Adcash's blocking library in the frame head, before the banner call.
    // Saved provider code remains editable through the owner dashboard.
    const library = content.match(/<script\b[^>]*\bsrc\s*=\s*(["'])(?:https:)?\/\/ascdn\.com\/script\/aclib\.js\1[^>]*>\s*<\/script>/i)?.[0] || "";
    if (library) content = content.replace(library, "");
    const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>body{margin:0;background:#12131b;color:#bbb;display:flex;justify-content:center;align-items:center;min-height:' + height + 'px;overflow:hidden}</style>' + library + '</head><body>' + content + '</body></html>';
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "sandbox allow-scripts allow-popups; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
