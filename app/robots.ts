import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:["/","/help","/privacy","/status"],disallow:["/admin","/api/","/install/"]},sitemap:"https://amaazsign.amaazbots.workers.dev/sitemap.xml"};}
