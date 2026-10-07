import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap{const base="https://amaazsign.amaazbots.workers.dev";return ["","/help","/privacy","/status","/trust","/terms","/removal"].map(path=>({url:base+path,lastModified:new Date(),changeFrequency:path?"monthly":"weekly",priority:path?0.6:1}));}
