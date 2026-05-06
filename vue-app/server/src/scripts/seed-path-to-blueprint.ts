import "dotenv/config";
import postgres from "postgres";

const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

const content = `
<div class="doc-header">
  <div class="label">Companion Article · Salesforce Architecture · 2GP</div>
  <h1>2GP Unlocked Package Dependency Structures<br/>Linear Chain, Flat &amp; Tiered</h1>
  <div class="subtitle">Dependency Resolution Framework — Linear Chain · Flat · Tiered — Migration Paths</div>
  <div class="meta-row">
    <span class="meta-tag">Second-Generation Packaging (2GP)</span>
    <span class="meta-tag">Unlocked Packages</span>
    <span class="meta-tag">Linear Chain · Flat · Tiered</span>
    <span class="meta-tag">Migration Paths</span>
    <span class="meta-tag">~10 min read</span>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="section-label">00 — Context</div>
    <div class="section-title">How This Relates to the Companion Article</div>
    <p class="section-desc"><a href="/blog/2gp-dependency-blueprint" style="color:var(--accent);text-decoration:none;font-weight:500;">2GP Package Dependency Structures — Star, Diamond, Mixed &amp; Inverted Funnel</a> covers four structures where the five-branch decision framework fully applies. This article covers the three remaining structures where applicability is partial or limited.</p>

    <div class="data-grid" style="grid-template-columns: 1fr 1.4fr 1.4fr;">
      <div class="cell hdr">Structure</div>
      <div class="cell hdr">Blueprint Applicability</div>
      <div class="cell hdr last-col">Primary Challenge</div>

      <div class="cell"><strong>Linear Chain</strong></div>
      <div class="cell">Partial — only when non-adjacent packages need to share</div>
      <div class="cell last-col">Transitive visibility hides problems until the chain breaks or branches</div>

      <div class="cell"><strong>Tiered / Layered</strong></div>
      <div class="cell">Partial — decisions are simpler once tiers are in place</div>
      <div class="cell last-col">Maintaining tier discipline and handling components that don't fit cleanly</div>

      <div class="cell last-row"><strong>Flat</strong></div>
      <div class="cell last-row">Limited — only controlled duplication applies without restructuring</div>
      <div class="cell last-col last-row">No shared infrastructure exists — sharing is structurally impossible without migration</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">01 — Linear Chain</div>
    <div class="section-title">The Linear Chain</div>

    <div class="detail-card" style="margin-bottom:28px;">
      <div class="detail-card-header">
        <h3 style="margin:0;">What is a Linear Chain?</h3>
        <span class="arch-badge badge-hm">Partially applies</span>
      </div>
      <div class="detail-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <pre class="lws-diagram">Pkg A → Pkg B → Pkg C → Pkg D</pre>
          </div>
          <div style="font-size:14px;color:var(--text-dim);display:flex;flex-direction:column;gap:8px;">
            <p style="margin:0;"><strong style="color:var(--text);">Shape:</strong> Sequential — each package depends on the one before it</p>
            <p style="margin:0;"><strong style="color:var(--text);">Visibility:</strong> Each package sees all packages upstream of it transitively</p>
            <p style="margin:0;"><strong style="color:var(--text);">Common in:</strong> Suites built sequentially, or layered products where each tier genuinely builds on the previous one</p>
          </div>
        </div>
      </div>
    </div>

    <p><strong>Adjacent packages — no conflict.</strong> In a pure linear chain, most sharing situations resolve themselves through transitive visibility. Package D depends on C, which depends on B, which depends on A. Package D already has access to everything in A, B, and C without any additional dependency declarations.</p>

    <pre class="lws-diagram">Pkg A → Pkg B → Pkg C → Pkg D

// Package D can already see:
✓  Everything in Pkg C  // direct dependency
✓  Everything in Pkg B  // transitive via C
✓  Everything in Pkg A  // transitive via B → C</pre>

    <div class="callout info">
      <strong>The key difference from the structures in the companion article:</strong> In a chain, packages are not siblings — they are ancestors and descendants. A downstream package does not need a special dependency declaration to reach upstream packages. The chain already provides access.
    </div>

    <p><strong>Non-adjacent sharing — where it gets complex.</strong> The real challenge in a linear chain is not downstream-to-upstream access — it is the reverse. When something needs to flow <em>against</em> the chain direction, or when a new package connects at a point in the middle, the structure creates tension.</p>

    <div class="callout info">
      <strong>Scenario 1 — A new package needs something from Package A, but should not depend on B or C.</strong> A new Package E needs a utility from Package A but has no business reason to depend on Package B or C. Adding it with a direct dependency on Package A transforms the chain into a Star or Mixed structure at that point — which is usually the correct move, and a signal that the linear structure is already outgrowing itself.
      <pre class="lws-diagram" style="margin-top:12px;">Pkg A → Pkg B → Pkg C → Pkg D   // original chain

// Package E added — depends only on A, not on B or C
Pkg A → Pkg E                    // this is now a Star branch, not a chain
Pkg A → Pkg B → Pkg C → Pkg D</pre>
    </div>

    <div class="callout warning">
      <strong>Scenario 2 — A component in a downstream package is needed by an upstream package.</strong> A component built in Package D turns out to be useful in Package B. Package B cannot depend on Package D — that would create a <strong>circular dependency</strong>, which 2GP does not permit and would break the installation order entirely. This is not a sharing problem — it is a placement error. The component was built in the wrong package. Apply the Blueprint's decision framework to promote it upstream.
      <pre class="lws-diagram" style="margin-top:12px;">// WRONG — circular dependency, not permitted in 2GP
Pkg A → Pkg B → Pkg C → Pkg D
              ←_________________|   // circular — invalid

// CORRECT — promote the component upstream
Pkg A  →  component moved here (if truly generic)
    or
Pkg Shared  →  component moved here (if cross-cutting but not base-level)</pre>
    </div>

    <p><strong>When the chain branches.</strong> The moment a linear chain produces its first branch — a point where two or more packages depend on the same upstream package — the structure is no longer a pure chain. It has become a Star or Mixed structure, and <strong>the decision framework from the companion article applies fully from that point on.</strong></p>

    <pre class="lws-diagram">Pkg A → Pkg B → Pkg C       // original chain segment
              ↓
               Pkg D         // branch appears — now Mixed/Star at this node</pre>

    <p>Do not try to preserve the linear chain by forcing Package D to depend on Package C when it only needs Package B. Acknowledge the structural shift, apply the Blueprint's framework for the new sibling relationship between C and D, and manage the graph accordingly.</p>

    <p><strong>Signals to reconsider the linear chain:</strong></p>
    <ul style="margin:12px 0 12px 1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:15px;color:var(--text-dim);">
      <li>A new package needs access to an upstream package but not all intermediate packages in the chain</li>
      <li>A component built downstream is needed by an upstream package — indicating circular dependency risk</li>
      <li>Two or more packages at the same level need to share something with each other</li>
      <li>The chain has grown past three or four packages and deployment ordering is becoming difficult to manage</li>
      <li>Changes to a middle package are causing unexpected ripple effects far downstream</li>
    </ul>

    <div class="callout warning">
      <strong>The linear chain is often a transitional structure.</strong> It tends to work well early, when a suite has few packages and clear sequential layers. As the suite grows and new packages are added that don't fit the sequence, the chain naturally evolves into a Mixed structure. Plan for that evolution rather than forcing new packages into a chain that no longer fits them.
    </div>
  </div>

  <div class="section">
    <div class="section-label">02 — Tiered / Layered</div>
    <div class="section-title">The Tiered / Layered Structure</div>

    <div class="detail-card" style="margin-bottom:28px;">
      <div class="detail-card-header">
        <h3 style="margin:0;">What is a Tiered / Layered Structure?</h3>
        <span class="arch-badge badge-vf">Target architecture</span>
      </div>
      <div class="detail-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <pre class="lws-diagram">Tier 0:  Pkg A (Foundation)
    ↓
Tier 1:  Pkg Shared
    ↓
Tier 2:  Pkg B   Pkg C   Pkg D
    ↓
Tier 3:  Pkg Suite</pre>
          </div>
          <div style="font-size:14px;color:var(--text-dim);display:flex;flex-direction:column;gap:8px;">
            <p style="margin:0;"><strong style="color:var(--text);">Shape:</strong> Explicit layers — dependencies only flow downward between tiers</p>
            <p style="margin:0;"><strong style="color:var(--text);">Visibility:</strong> Each package sees its own tier's dependencies and everything below</p>
            <p style="margin:0;"><strong style="color:var(--text);">Common in:</strong> Mature platform products and ISV suites with active architectural governance</p>
          </div>
        </div>
      </div>
    </div>

    <p>This is the target architecture described in the companion article. If your suite has reached this structure, the five-branch decision framework has largely done its job. The challenge now shifts from <em>resolving</em> conflicts to <em>maintaining</em> the structure as the suite continues to grow.</p>

    <p><strong>Simplified tier-based decisions.</strong> In a tiered structure, the full five-branch decision tree collapses into a single, clearer question for most situations:</p>

    <div class="callout info">
      <strong>The tier question:</strong> When a new component is created or an existing one needs to be shared, ask — <em>"Which tier does this component naturally belong to, based on its scope of relevance?"</em><br/><br/>
      <strong>Tier 0</strong> — if every consumer of the base package would reasonably want it<br/>
      <strong>Tier 1</strong> — if multiple domain packages need it, but it is too specific for the base<br/>
      <strong>Tier 2</strong> — if it belongs exclusively to one domain<br/>
      <strong>Tier 3</strong> — if it is the result of intentional domain aggregation
    </div>

    <p><strong>Governance at scale.</strong> A tiered structure is only as good as the discipline that maintains it.</p>

    <ol style="margin:12px 0 20px 1.25rem;display:flex;flex-direction:column;gap:0.75rem;font-size:15px;color:var(--text-dim);">
      <li><strong style="color:var(--text);">Enforce tier rules in code review.</strong> Any new dependency declaration in <code>sfdx-project.json</code> that crosses tier boundaries sideways — a Tier 2 package depending on another Tier 2 package — should require explicit architect approval and an Architecture Decision Record entry.</li>
      <li><strong style="color:var(--text);">Keep the tier diagram as a living artifact.</strong> Update it on every package addition or structural change. Treat it the same way you treat a data model diagram.</li>
      <li><strong style="color:var(--text);">Assign tier ownership.</strong> Each tier should have a clear owner or owning team. Tier 0 and Tier 1 in particular need careful stewardship — they affect every downstream package.</li>
      <li><strong style="color:var(--text);">Run the full decision framework for any new shared component.</strong> Even in a tiered structure, a new component that could live in multiple tiers deserves a conscious decision rather than a default placement.</li>
      <li><strong style="color:var(--text);">Review tier assignments periodically.</strong> A component placed in Tier 2 today may be needed by three packages in six months, warranting promotion to Tier 1.</li>
    </ol>

    <p><strong>Edge cases and exceptions.</strong></p>

    <div class="callout info">
      <strong>Edge Case 1 — A component does not fit cleanly into any single tier.</strong> When a component sits on the boundary between Tier 0 and Tier 1, err toward Tier 1. It is always easier to promote a component from Tier 1 to Tier 0 in a later release than to remove it from Tier 0 once every downstream package has taken a dependency on it. Removing from Tier 0 is a breaking change; adding to Tier 0 is just a promotion.
    </div>

    <div class="callout warning">
      <strong>Edge Case 2 — A Tier 2 package needs something from another Tier 2 package, just once.</strong> This is the situation the Blueprint's decision framework was built for, and it does not disappear in a tiered structure — it just becomes less frequent. Run the full five-branch tree. Do not treat the tiered structure as a reason to skip the framework. "It is just this once" is how sideways Tier 2 coupling starts.
    </div>

    <div class="callout info">
      <strong>Edge Case 3 — The suite has grown to a point where Tier 1 itself needs splitting.</strong> In a large suite, a single Shared Package at Tier 1 can accumulate enough unrelated components that it becomes its own bloat problem. Consider splitting Tier 1 into multiple focused shared packages — one for UI components, one for integration adapters, one for cross-domain services — each with its own release cadence and ownership. The tiers remain the same; Tier 1 simply becomes a collection of packages rather than a single one.
    </div>
  </div>

  <div class="section">
    <div class="section-label">03 — Flat</div>
    <div class="section-title">The Flat Structure</div>

    <div class="detail-card" style="margin-bottom:28px;">
      <div class="detail-card-header">
        <h3 style="margin:0;">What is a Flat Structure?</h3>
        <span class="arch-badge badge-canvas">Limited applicability</span>
      </div>
      <div class="detail-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <pre class="lws-diagram">Pkg A   Pkg B   Pkg C   Pkg D
  (no inter-package dependencies)</pre>
          </div>
          <div style="font-size:14px;color:var(--text-dim);display:flex;flex-direction:column;gap:8px;">
            <p style="margin:0;"><strong style="color:var(--text);">Shape:</strong> Fully independent — no package depends on any other</p>
            <p style="margin:0;"><strong style="color:var(--text);">Visibility:</strong> Each package can only see its own contents</p>
            <p style="margin:0;"><strong style="color:var(--text);">Common in:</strong> Suites used as deployment units, early-stage orgs, or organizations that intentionally avoid shared infrastructure</p>
          </div>
        </div>
      </div>
    </div>

    <p>In a flat structure, the Blueprint's decision framework cannot be applied in full — Branches 1, 2, and 3 all require a base or shared package to exist, and Branch 4 requires at least one package to depend on another. The only option available <strong>without restructuring</strong> is Branch 5: controlled duplication.</p>

    <div class="callout danger">
      <strong>Controlled duplication is a holding pattern, not a strategy.</strong> It is appropriate for small, stable, semantically distinct components. It is not appropriate for business logic, integration adapters, data model elements, or anything that will evolve. If your sharing needs are growing beyond small utilities, the flat structure needs to evolve — and the sooner that decision is made, the lower the migration cost.
    </div>

    <p><strong>Signals it is time to restructure:</strong></p>
    <ul style="margin:12px 0 20px 1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:15px;color:var(--text-dim);">
      <li>The same utility, helper, or component has been duplicated across three or more packages</li>
      <li>A bug fix in a shared component requires the same change to be made in multiple packages simultaneously</li>
      <li>A new package is being planned that will clearly need components from multiple existing packages</li>
      <li>Deployment coordination is becoming complex because of redundant logic that is drifting out of sync</li>
      <li>A product requirement needs a component that would logically serve the entire suite, not just one package</li>
      <li>Engineers are asking "where should this live?" more than once per sprint</li>
    </ul>

    <p><strong>Migration path out of flat.</strong> Migrating away from a flat structure does not require a big-bang restructure. The cleanest path is to introduce a base package incrementally — starting with the components that are already duplicated most widely, and letting the new structure absorb components over time.</p>

    <div class="flow-steps">
      <div class="flow-step">
        <div class="step-num">1</div>
        <div class="step-content">
          <strong>Audit your duplicated components</strong>
          <p>Catalog every component that exists in more than one package. Note how many copies exist, how much they have diverged, and how frequently they are changed. This gives you the priority order for migration — highest duplication and highest change frequency go first.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">2</div>
        <div class="step-content">
          <strong>Create a new base package (Tier 0)</strong>
          <p>Create a new 2GP unlocked package to serve as the foundation. At this stage it is empty — just a package definition in <code>sfdx-project.json</code>. Give it a deliberate, permanent namespace. This package will be the most depended-upon package in the suite, so its namespace and versioning strategy need to be decided with care before anything is moved into it.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">3</div>
        <div class="step-content">
          <strong>Move the highest-priority duplicates first</strong>
          <p>Run the Blueprint's decision framework on each duplicated component. Purely generic, zero-domain components go into Tier 0. Components with a generic core and domain extensions get split (Branch 2). Apply one component at a time — do not batch large moves. Each move requires a new package version of the base package and a version bump in every package that adopts the dependency.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">4</div>
        <div class="step-content">
          <strong>Add the base package as a dependency in each domain package</strong>
          <p>As components are moved to the base package, update each domain package's <code>sfdx-project.json</code> to declare the new dependency. Remove the now-redundant local copies. Each domain package should adopt the dependency in its own release cycle — you do not need all packages to update simultaneously.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">5</div>
        <div class="step-content">
          <strong>Evaluate whether a Tier 1 Shared Package is also needed</strong>
          <p>Once the base package is in place, apply the Blueprint's decision framework to remaining shared components. If cross-cutting capabilities exist that are too specific for Tier 0 but needed by multiple domain packages, introduce a Tier 1 Shared Package. You have now arrived at the Tiered / Layered structure.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">6</div>
        <div class="step-content">
          <strong>Formalize the tier structure and governance</strong>
          <p>Document the tiers, assign ownership, and update your CI pipeline to enforce dependency direction rules. From this point, new components go through the Blueprint's framework as a standard part of every sprint — not as a reactive fix when something breaks.</p>
        </div>
      </div>
    </div>

    <div class="callout success">
      <strong>Migration is iterative, not atomic.</strong> You do not need to move everything before the new structure starts delivering value. Even a base package with two or three shared utilities reduces duplication immediately and sets the governance foundation. Incremental progress is far safer than a full restructure in a single release.
    </div>
  </div>

  <div class="section">
    <div class="section-label">04 — Migration Paths</div>
    <div class="section-title">Migration Paths — At a Glance</div>
    <p class="section-desc">Each structure has a natural migration path toward the Tiered / Layered target. The effort and risk depends on how far the current structure is from the target and how much the packages have grown.</p>

    <div class="data-grid" style="grid-template-columns: 100px 1fr 1fr 1fr;">
      <div class="cell hdr">From</div>
      <div class="cell hdr">First Step</div>
      <div class="cell hdr">Migration Effort</div>
      <div class="cell hdr last-col">Biggest Risk</div>

      <div class="cell dim">Linear Chain</div>
      <div class="cell">Formalize the chain's first node as Tier 0, apply the Blueprint at every branch point</div>
      <div class="cell">Low to moderate — chain already has implicit tiers</div>
      <div class="cell last-col">Resisting the urge to keep extending the chain instead of branching</div>

      <div class="cell dim">Flat</div>
      <div class="cell">Create an empty base package, audit duplicates, migrate highest-priority components first</div>
      <div class="cell">Moderate to high — depends on how much duplication has accumulated</div>
      <div class="cell last-col">Trying to migrate everything at once — incremental is safer</div>

      <div class="cell dim last-row">Tiered / Layered</div>
      <div class="cell last-row">No migration needed — apply the Blueprint framework for ongoing governance</div>
      <div class="cell last-row">Ongoing — governance is continuous, not one-time</div>
      <div class="cell last-col last-row">Tier discipline eroding over time without active enforcement</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">05 — Summary</div>
    <div class="section-title">Summary Reference</div>

    <div class="data-grid" style="grid-template-columns: 1fr 1.2fr 1.2fr 1.1fr;">
      <div class="cell hdr">Structure</div>
      <div class="cell hdr">Blueprint Applies?</div>
      <div class="cell hdr">Primary Action</div>
      <div class="cell hdr last-col">When to Evolve</div>

      <div class="cell dim">Linear Chain</div>
      <div class="cell">Only when chain branches or a downstream component is needed upstream</div>
      <div class="cell">Apply Blueprint at branch points; treat circular dependency risks as placement errors</div>
      <div class="cell last-col">When new packages no longer fit the sequence, or chain has grown past 3–4 packages</div>

      <div class="cell dim">Tiered / Layered</div>
      <div class="cell">Yes — simplified to a tier-placement question in most cases</div>
      <div class="cell">Govern with tier discipline; run full Blueprint framework for ambiguous cases</div>
      <div class="cell last-col">When Tier 1 accumulates too many unrelated components — split it</div>

      <div class="cell dim last-row">Flat</div>
      <div class="cell last-row">Only Branch 5 — controlled duplication — without restructuring</div>
      <div class="cell last-row">Tolerate controlled duplication short-term; plan base package introduction</div>
      <div class="cell last-col last-row">When the same component is duplicated across 3+ packages, or logic is drifting out of sync</div>
    </div>

    <div class="callout info">
      <strong>Companion article:</strong> <a href="/blog/2gp-dependency-blueprint" style="color:var(--accent);text-decoration:none;font-weight:500;">2GP Package Dependency Structures — Star, Diamond, Mixed &amp; Inverted Funnel — Dependency Resolution Framework</a>. Intended audience: Salesforce Technical Architects and Senior Developers working with multi-package 2GP Unlocked Packages.
    </div>
  </div>

</div>
`;

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"2gp-path-to-blueprint"},
      ${"2GP Unlocked Package Dependency Structures — Linear Chain, Flat & Tiered — Dependency Resolution Framework"},
      ${"Dependency Resolution Framework — Linear Chain · Flat · Tiered — Migration Paths"},
      ${"April 27, 2026"},
      ${["Salesforce", "2GP", "Architecture", "Unlocked Packages", "Migration"]},
      ${"Not every package suite starts in the right structure. This companion guide covers the three dependency structures where the Blueprint's decision framework has limited or partial reach — and what to do instead, including how to migrate toward a healthier architecture."},
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
