import fs from "node:fs";

const databaseId=process.env.AMAAZSIGN_D1_ID?.trim();
if(!databaseId)throw new Error("Set AMAAZSIGN_D1_ID to the database_id printed by `npx wrangler d1 create amaazsign-db`.");
if(!/^[0-9a-f-]{20,}$/i.test(databaseId))throw new Error("AMAAZSIGN_D1_ID does not look like a Cloudflare D1 database ID.");

const source=JSON.parse(fs.readFileSync("dist/server/wrangler.json","utf8"));
source.name="amaazsign";
source.d1_databases=[{binding:"DB",database_name:"amaazsign-db",database_id:databaseId}];
source.r2_buckets=[{binding:"BUCKET",bucket_name:"amaazsign-files"}];
source.vars={...(source.vars||{}),SITE_PUBLIC:"true"};
source.observability={enabled:true};
fs.writeFileSync("wrangler.deploy.json",JSON.stringify(source,null,2)+"\n");
console.log("Prepared wrangler.deploy.json for AmaazSign.");
