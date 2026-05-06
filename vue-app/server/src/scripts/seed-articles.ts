import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

// Extract the HTML string from the TS file at runtime
// The file exports: const html = `...`; export default html;
const tsSource = readFileSync(
  join(__dirname, "../../../client/src/data/articles/salesforce-widget.ts"),
  "utf-8",
);
// Strip the TS wrapper — extract everything between the first backtick and `export default`
const match = tsSource.match(/const html = `([\s\S]*)`;\s*export default html/);
if (!match) throw new Error("Could not parse article content");
const content = match[1];

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"salesforce-widget-integration"},
      ${"Third-Party Widget Integration — Salesforce Experience Cloud"},
      ${"LWC · Visualforce · Canvas — Capabilities, Constraints & Architecture Guidance"},
      ${"April 29, 2026"},
      ${["Salesforce", "Experience Cloud", "LWC", "LWS", "LWR", "Aura"]},
      ${"A technical architecture reference for integrating any external third-party widget into Salesforce Experience Cloud. Covers LWR vs Aura runtimes, LWC and Lightning Web Security constraints, Visualforce full-screen overlay, Salesforce Canvas, Head Markup injection — with a full capability matrix, integration approach guidance, third-party cookie restrictions, and CSP directive selection."},
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
  console.log("Article seeded successfully");
  await neon.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
