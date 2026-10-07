"use client";
import type { AdPlacement } from "@/lib/types";
export function AdSlot({ settings, slot = "sidebar" }: { settings: AdPlacement; slot?: "sidebar" | "result" }) {
  if(!settings.enabled || !settings.html.trim()) return slot === "result" ? null : <div className="ad-placeholder"><span>ADVERTISEMENT</span><p>Support free signing</p><small>Ad space · 300 × 250</small></div>;
  return <section className={"ad-frame" + (slot === "result" ? " ad-frame-result" : "")}><span>ADVERTISEMENT · {settings.provider}</span><iframe title={settings.provider + (slot === "result" ? " signed-app advertisement" : " sidebar advertisement")} src={slot === "result" ? "/ads/frame?slot=result" : "/ads/frame"} sandbox="allow-scripts allow-popups" referrerPolicy="strict-origin-when-cross-origin" /></section>;
}
