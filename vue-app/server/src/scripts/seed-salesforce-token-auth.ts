import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

const tsSource = readFileSync(
  join(__dirname, "../../../client/src/data/articles/salesforce-token-auth.ts"),
  "utf-8",
);
const match = tsSource.match(/const html = `([\s\S]*)`;\s*export default html/);
if (!match) throw new Error("Could not parse article content");
const content = match[1];

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"salesforce-token-auth"},
      ${"Obtaining User-Scoped Salesforce Tokens Without a Password"},
      ${"JWT Bearer Grant · OAuth 2.0 Token Exchange — Server-to-Server Authentication Patterns"},
      ${"April 30, 2026"},
      ${["Salesforce", "OAuth 2.0", "JWT", "Token Exchange", "Authentication", "RFC 7523", "RFC 8693"]},
      ${"A technical architecture reference for obtaining user-scoped Salesforce access tokens from a server without passwords or browser redirects. Covers the JWT Bearer grant (RFC 7523) with RSA certificate setup and the OAuth 2.0 Token Exchange grant (RFC 8693) with Apex handler implementation — including Salesforce Connected App and External Client App configuration, sequence diagrams, and architecture guidance on when to use each pattern."},
      ${content},
      ${false}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title       = EXCLUDED.title,
      subtitle    = EXCLUDED.subtitle,
      date        = EXCLUDED.date,
      tags        = EXCLUDED.tags,
      description = EXCLUDED.description,
      content     = EXCLUDED.content,
      updated_at  = now()
  `;
  console.log("Draft saved: salesforce-token-auth");
  await neon.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
