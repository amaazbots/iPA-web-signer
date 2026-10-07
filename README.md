# AmaazSign

Browser-based IPA signing and temporary iPhone installation links, built for Cloudflare Workers with D1 and R2.

## What stays private

- Personal certificates selected in **My certificate** never leave the browser.
- Shared certificates are intentionally delivered to visitors for browser-side signing. Only add certificate bundles you are permitted to share.
- No certificate files, passwords, admin passwords, or Cloudflare credentials belong in this repository.

## Free Cloudflare deployment

Requirements: Node.js 22+, a free Cloudflare account, and Git.

1. Install dependencies: `npm install`
2. Sign in securely: `npx wrangler login`
3. Create the database: `npx wrangler d1 create amaazsign-db`
4. Create storage: `npx wrangler r2 bucket create amaazsign-files`
5. Copy the `database_id` printed in step 3.
6. Build and prepare the deployment:
   - Windows PowerShell: `$env:AMAAZSIGN_D1_ID="paste-id-here"; npm run cf:prepare`
   - macOS/Linux: `AMAAZSIGN_D1_ID="paste-id-here" npm run cf:prepare`
7. Create the database tables:
   - `npx wrangler d1 execute amaazsign-db --remote --config wrangler.deploy.json --file drizzle/0000_brave_mathemanic.sql`
   - `npx wrangler d1 execute amaazsign-db --remote --config wrangler.deploy.json --file drizzle/0001_narrow_overlord.sql`
8. Set a strong dashboard password: `npx wrangler secret put ADMIN_PASSWORD --config wrangler.deploy.json`
9. Set a separate random session secret: `npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.deploy.json`
10. Deploy: `npm run cf:deploy`

Wrangler prints the public `workers.dev` address. Open `/admin`, enter the password from step 8, and upload shared certificates through the dashboard.

Future updates only need `npm run cf:prepare` and `npm run cf:deploy`.

`wrangler.deploy.json` is generated locally and ignored by Git because it contains account-specific resource identifiers.

## Development

- `npm run dev` — local development
- `npm run build` — production build
- `npm run cf:prepare` — build and generate standalone Cloudflare configuration
- `npm run cf:deploy` — deploy the prepared build

IPA signing happens locally in the visitor's browser. D1 stores certificate metadata and install-link records; R2 stores explicitly shared certificate bundles and signed IPAs uploaded for temporary installation links.
