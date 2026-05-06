import "dotenv/config";
import postgres from "postgres";

const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

const content = `
<div class="doc-header">
  <div class="label">Salesforce Architecture · 2GP</div>
  <h1>2GP Unlocked Package Dependency Structures<br/>Star, Diamond, Mixed &amp; Inverted Funnel</h1>
  <div class="subtitle">Dependency Resolution Framework — Dependency Structures · Decision Framework · Target Architecture</div>
  <div class="meta-row">
    <span class="meta-tag">Second-Generation Packaging (2GP)</span>
    <span class="meta-tag">Unlocked Packages</span>
    <span class="meta-tag">Dependency Graph Patterns</span>
    <span class="meta-tag">~15 min read</span>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="section-label">00 — Overview</div>
    <div class="section-title">The Core Problem</div>
    <p class="section-desc">In a multi-package 2GP setup, a recurring challenge emerges as the suite grows: a component living in Package B is needed by Package C — but Package C has no dependency on Package B.</p>
    <pre class="lws-diagram">Package A  (Base)
    ├── Package B     ← Component B lives here
    └── Package C     ← needs Component B, but cannot see Package B</pre>
    <p>The instinct is to add Package B as a dependency of Package C. Resist it. Done without deliberate thought, this creates tight coupling, brittle deployment ordering, and a dependency graph that compounds in complexity every time the same shortcut is repeated.</p>
    <p>The right answer depends entirely on the nature of the component in question. Before exploring the framework that resolves this, it is worth understanding the dependency structures in which this problem actually arises.</p>
  </div>

  <div class="section">
    <div class="section-label">01 — Context</div>
    <div class="section-title">Dependency Structures — Where This Applies</div>
    <p class="section-desc">Not all dependency structures produce the same challenges. This article and the decision framework within it apply directly to the four structures below — the ones where domain packages exist alongside each other and the need to share components between them is a real, recurring concern.</p>

    <div class="option-cards">
      <div class="option-card">
        <span class="oc-badge oc-primary">Fully applies</span>
        <h4>Star / Hub-and-Spoke</h4>
        <pre class="lws-diagram">      Package A (Hub)
     /    |    |    \\
  Pkg B  Pkg C  Pkg D  Pkg E</pre>
        <p style="font-size:14px;color:var(--text-dim);margin-top:8px;">One central base package. All domain packages depend solely on it and are completely invisible to each other. Every sharing need between sibling packages hits the decision framework immediately — all five branches are in play.</p>
      </div>

      <div class="option-card">
        <span class="oc-badge oc-primary">Fully applies</span>
        <h4>Diamond</h4>
        <pre class="lws-diagram">      Package A
     /          \\
Package B    Package C
     \\          /
      Package D</pre>
        <p style="font-size:14px;color:var(--text-dim);margin-top:8px;">Two or more packages share a common base and feed into a common downstream consumer. This is the canonical structure the framework was designed around. Version alignment and component placement are both critical concerns here.</p>
      </div>

      <div class="option-card">
        <span class="oc-badge oc-primary">Fully applies</span>
        <h4>Mixed / Hybrid</h4>
        <pre class="lws-diagram">      Package A (Base)
     /      |       \\
  Pkg B  Pkg Shared  Pkg C
  /   \\      |
Pkg D  Pkg E  Pkg F</pre>
        <p style="font-size:14px;color:var(--text-dim);margin-top:8px;">Different parts of the suite evolved with different patterns. No single clean structure applies throughout. This is the most common real-world state — and where having a repeatable decision process matters most.</p>
      </div>

      <div class="option-card">
        <span class="oc-badge oc-primary">Fully applies</span>
        <h4>Inverted Funnel</h4>
        <pre class="lws-diagram">Pkg B  Pkg C  Pkg D  Pkg E
  \\       \\   /       /
        Pkg Suite</pre>
        <p style="font-size:14px;color:var(--text-dim);margin-top:8px;">Multiple independent domain packages aggregated by a single composite package. Domain packages remain fully decoupled from each other. Sharing between siblings hits the framework directly; the Suite package's dependency on each domain is Branch 4 by design.</p>
      </div>
    </div>

    <div class="callout warning">
      <strong>Structures not covered by this article:</strong> The <strong>Linear Chain</strong> (packages depend on each other sequentially), the <strong>Flat</strong> structure (no inter-package dependencies at all), and the fully implemented <strong>Tiered / Layered</strong> structure each present different characteristics. This article assumes at least one shared base package exists and that domain packages are siblings that cannot see each other by default.
    </div>
  </div>

  <div class="section">
    <div class="section-label">02 — Target Architecture</div>
    <div class="section-title">The Tiered / Layered Structure</div>
    <p class="section-desc">Of all the structures above, the one to deliberately work toward — and the one that makes every dependency decision clearer — is the Tiered / Layered structure. It is not a starting point; it is a destination. The decision framework in this article is the tool you use to get there.</p>

    <div class="recommendation">
      <div class="rec-header">
        <span class="rec-badge">Architecture Guidance</span>
        <h3>Tiered / Layered Structure — The Target</h3>
      </div>
      <p>Packages are explicitly organised into dependency tiers. Dependencies only ever flow downward — never sideways between packages at the same tier. Each tier has a clear, bounded purpose.</p>
      <pre class="code-block">Tier 0  →  Base Package          // pure utilities, core data model, abstract contracts
          ↓
Tier 1  →  Shared Package         // cross-domain capabilities, promoted components
          ↓
Tier 2  →  Domain Packages        // independent business domains — no sideways deps
          ↓
Tier 3  →  Composite Packages     // intentional aggregation of domain packages</pre>
      <ul>
        <li>Dependency direction is unambiguous — any engineer can determine the correct home for a new component without an architect present</li>
        <li>Sideways coupling between domain packages is structurally impossible by convention, not just by intention</li>
        <li>The decision framework maps directly onto the tiers — each branch tells you which tier a component belongs in</li>
        <li>Deployment ordering is predictable and stable, even as the suite grows</li>
        <li>New packages can be added to any tier without disturbing packages in other tiers</li>
      </ul>
    </div>

    <p>If your suite currently matches one of the four applicable structures above, the framework that follows is how you progressively reshape it toward this target — one component decision at a time.</p>
  </div>

  <div class="section">
    <div class="section-label">03 — Framework</div>
    <div class="section-title">The Decision Framework</div>
    <p class="section-desc">Every time a component in one package is needed by another package that cannot see it, walk this tree. Each branch maps to a concrete action — and to a tier in the recommended structure.</p>

    <div class="decision-tree">
      <div class="dt-row">
        <div class="dt-condition">Is Component B generic with no domain logic?</div>
        <div class="dt-arrow">→</div>
        <div class="dt-result vf">YES: Move it to Package A (Tier 0 — the base)</div>
      </div>
      <div class="dt-row">
        <div class="dt-condition">Does it have a generic core + domain-specific extension?</div>
        <div class="dt-arrow">→</div>
        <div class="dt-result vf">YES: Split — core to Package A (Tier 0), extension stays in Package B (Tier 2)</div>
      </div>
      <div class="dt-row">
        <div class="dt-condition">Will more packages need it over time?</div>
        <div class="dt-arrow">→</div>
        <div class="dt-result canvas">YES: Create a Shared Package (Tier 1)</div>
      </div>
      <div class="dt-row">
        <div class="dt-condition">Is Package C a functional superset of Package B?</div>
        <div class="dt-arrow">→</div>
        <div class="dt-result hybrid">YES: Add explicit dependency (Tier 3 composite — documented)</div>
      </div>
      <div class="dt-row">
        <div class="dt-condition">None of the above</div>
        <div class="dt-arrow">→</div>
        <div class="dt-result" style="color:var(--text-muted)">Consider controlled duplication (Tier 2 — stays local)</div>
      </div>
    </div>

    <p>Each branch is explored in detail below, with a concrete example and the guardrails that come with it.</p>
  </div>

  <div class="section">
    <div class="section-label">04 — Branch 1</div>
    <div class="section-title">Move to the Base Package</div>
    <p class="section-desc">For components that are truly generic — no domain logic whatsoever. Destination: Tier 0.</p>

    <div class="callout info">
      <strong>Example scenario:</strong> A stateless utility class with no object references or domain awareness. While building Package B, a developer creates a helper class — a formatter, a parser, a calculation utility — that handles a common, domain-agnostic operation. At some point, Package C needs the exact same behavior.
    </div>

    <p><strong>Why it belongs in Package A:</strong> The class has zero knowledge of any business domain. It holds no object references specific to Package B, carries no domain-driven logic, and produces no side effects. Any package in the org — now or in the future — could reasonably benefit from it.</p>

    <pre class="code-block">// BEFORE — utility lives in Package B (Tier 2)
Package B  →  HelperUtil.cls

// AFTER — promoted to Package A (Tier 0)
Package A  →  HelperUtil.cls
Package B  →  still uses it via its dependency on Package A
Package C  →  uses it via its existing dependency on Package A</pre>

    <div class="callout success">
      <strong>The test that confirms this decision:</strong> Ask — <em>"Would every package that depends on Package A reasonably want this component?"</em> If the answer is a confident yes, Tier 0 is the right home.
    </div>
    <div class="callout warning">
      <strong>Guardrail against base package bloat:</strong> Not everything generic belongs in Tier 0. If only a subset of consumers would ever use a component, Tier 1 — a Shared Package — is the more appropriate home. Base package bloat slows every installation and makes every upgrade riskier for all consumers.
    </div>
  </div>

  <div class="section">
    <div class="section-label">05 — Branch 2</div>
    <div class="section-title">Split Core &amp; Extension</div>
    <p class="section-desc">For components with a reusable shell and a domain-specific callback or logic layer. Destination: core to Tier 0, extensions remain in Tier 2.</p>

    <div class="callout info">
      <strong>Example scenario:</strong> A UI component with a shared interaction pattern but domain-specific post-action behavior. Package B contains a file uploader that handles the full user interaction — selection, validation, progress tracking, and on completion a call to a Package B-specific Apex service. Package C needs the same component but its post-completion logic links the result to a completely different record type owned by Package C.
    </div>

    <pre class="code-block">// BEFORE — full component in Package B (Tier 2) with domain logic baked in
Package B  →  fileUploader  (UI + Package B-specific service call)

// AFTER — generic base in Tier 0, domain extensions remain in Tier 2
Package A  →  fileUploaderBase         // Tier 0 — generic shell
               - validation logic
               - progress and state management
               - fires a generic "actionComplete" custom event
               - no knowledge of any domain package

Package B  →  packageBFileUploader    // Tier 2 — domain extension
               - wraps fileUploaderBase
               - handles "actionComplete" → PackageBService.linkRecord()

Package C  →  packageCFileUploader    // Tier 2 — domain extension
               - wraps fileUploaderBase
               - handles "actionComplete" → PackageCService.linkRecord()</pre>

    <p>The same pattern applies in Apex using abstract classes:</p>

    <pre class="code-block">// Package A (Tier 0) — generic abstract contract
public abstract class ProcessorBase {
    public abstract void onComplete(Id recordId);
    public void validate(String input) { /* shared validation logic */ }
}

// Package B (Tier 2) — domain-specific implementation
public class PackageBProcessor extends ProcessorBase {
    public override void onComplete(Id recordId) { /* Package B logic */ }
}

// Package C (Tier 2) — domain-specific implementation
public class PackageCProcessor extends ProcessorBase {
    public override void onComplete(Id recordId) { /* Package C logic */ }
}</pre>

    <div class="callout success">
      <strong>Key principle:</strong> Define interfaces and abstract contracts in Tier 0. Domain packages at Tier 2 provide the concrete implementations. This keeps the dependency graph stable even as domain logic evolves independently across release cycles.
    </div>
  </div>

  <div class="section">
    <div class="section-label">06 — Branch 3</div>
    <div class="section-title">Create a Shared Package</div>
    <p class="section-desc">For domain-capable components that multiple packages need — but that don't belong in the base. Destination: Tier 1.</p>

    <div class="callout info">
      <strong>Example scenario:</strong> A feature-rich integration component with growing cross-package demand. Package B contains a sophisticated component — one that integrates with an external service, has its own UI, manages caching and error handling, and follows its own configuration model. Over time, Package C needs it for one use case, and another package needs it for yet another. None of these packages have any other reason to depend on Package B.
    </div>

    <p><strong>Why it doesn't belong in Tier 0:</strong> This is not foundational infrastructure. It is a specific capability with its own external dependency and release cadence. Putting it in the base forces it onto every consumer in the org regardless of relevance.</p>
    <p><strong>Why Tier 1 is the appropriate path:</strong> The component has cross-package demand, its own versioning concerns, and deserves deliberate team ownership. A Shared Package makes the contract explicit — packages that need this capability declare it as a Tier 1 dependency; packages that don't are completely unaffected.</p>

    <pre class="lws-diagram">// BEFORE — component trapped in Package B (Tier 2)
Package A (Tier 0)
    ├── Package B   ← component lives here
    ├── Package C   ← cannot see it
    └── Package D   ← cannot see it

// AFTER — promoted to Shared Package (Tier 1)
Package A (Tier 0)
    └── Package Shared (Tier 1)
            └── shared component (+ future cross-cutting capabilities)
            ├── Package B (Tier 2)   ← depends on Shared
            ├── Package C (Tier 2)   ← depends on Shared
            └── Package D (Tier 2)   ← depends on Shared</pre>

    <div class="callout success">
      <strong>The signal that confirms this path:</strong> When you find yourself asking <em>"should I just add Package B as a dependency of Package C for this one component?"</em> — and the answer feels architecturally wrong — that discomfort is the signal that Tier 1 is the correct path.
    </div>
    <div class="callout warning">
      <strong>Investment consideration:</strong> This introduces a new package to maintain, version, and release independently. The payoff grows as your suite expands and cross-cutting components become more frequent. If this situation is already recurring, the Tier 1 investment will pay for itself quickly.
    </div>
  </div>

  <div class="section">
    <div class="section-label">07 — Branch 4</div>
    <div class="section-title">Add an Explicit Dependency</div>
    <p class="section-desc">Acceptable only when Package C is architecturally defined as a composite or superset. Destination: Tier 3.</p>

    <div class="callout info">
      <strong>Example scenario:</strong> A bundle or suite package that intentionally aggregates multiple domain packages. Package C exists specifically to deliver a bundled experience. It is designed from the outset to combine the capabilities of Package B and other packages into a single, cohesive product for a specific audience or deployment scenario. It is not an independent domain package — it is a composite that sits at Tier 3 by design.
    </div>

    <pre class="lws-diagram">// Package C (Tier 3) explicitly and intentionally depends on Package B (Tier 2)
Package A (Tier 0 — Base)
    ├── Package B (Tier 2 — domain)
    └── Package C (Tier 3 — composite)
            depends on → Package A    // standard Tier 0 dependency
            depends on → Package B    // intentional Tier 3 → Tier 2 coupling, documented</pre>

    <p>Guardrails that must be in place when taking this path:</p>
    <ul style="margin: 12px 0 12px 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; font-size: 15px; color: var(--text-dim);">
      <li>Document this in your Architecture Decision Record: <em>"Package C is a Tier 3 composite. Its dependency on Package B is by design, not convenience."</em></li>
      <li>Enforce in CI that Package C's <code>sfdx-project.json</code> dependency list is reviewed on every release — changes require architect sign-off.</li>
      <li>Never allow a Tier 2 domain package to follow the same pattern. This coupling pattern is only permitted at Tier 3.</li>
    </ul>

    <div class="callout danger">
      <strong>This branch is the most dangerous to misuse.</strong> Adding an explicit dependency purely for convenience — without a genuine Tier 3 composite justification — is the most common shortcut that creates long-term architectural debt in multi-package 2GP setups.
    </div>
  </div>

  <div class="section">
    <div class="section-label">08 — Branch 5</div>
    <div class="section-title">Controlled Duplication</div>
    <p class="section-desc">Acceptable when the component is small, stable, semantically distinct, and no other package needs it. Destination: stays local to each Tier 2 package.</p>

    <div class="callout info">
      <strong>Example scenario:</strong> Two visually similar but semantically independent status components. Package B has a small status badge component — a colored indicator that reflects the lifecycle states of a Package B record. Package C wants something visually similar but representing entirely different lifecycle states owned by Package C. The components share a visual pattern but have different status labels, different color mappings, and will evolve independently.
    </div>

    <pre class="code-block">Package B  →  packageBStatusBadge  // Tier 2 — Package B lifecycle states
Package C  →  packageCStatusBadge  // Tier 2 — Package C lifecycle states</pre>

    <p><strong>"Controlled" is the operative word.</strong> These guardrails must hold for duplication to be acceptable:</p>
    <ul style="margin: 12px 0 12px 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; font-size: 15px; color: var(--text-dim);">
      <li>Duplication is a <strong>conscious, documented decision</strong> — not a time-pressure shortcut. Record it in your ADR or package documentation.</li>
      <li>Each copy is <strong>fully owned by its package team</strong>. There is no expectation of synchronisation.</li>
      <li><strong>Revisit if a third package needs the same thing.</strong> At that point, Tier 1 almost certainly applies.</li>
      <li>Set a periodic checkpoint to re-evaluate. What is small today may grow into something that warrants promotion.</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-label">09 — Common Patterns</div>
    <div class="section-title">Common Patterns at Scale</div>
    <p class="section-desc">As your package suite grows and this pattern recurs, these principles prevent the dependency graph from becoming unmanageable — and progressively move you toward the Tiered / Layered target structure.</p>

    <p><strong>Enforce tier discipline explicitly.</strong> Define your tiers in writing and enforce them in code review and CI. Dependencies should only flow downward. A sideways dependency between two Tier 2 packages that slips through review is a future incident waiting to happen.</p>

    <div class="data-grid" style="grid-template-columns: 100px 1fr 1fr;">
      <div class="cell hdr">Tier</div>
      <div class="cell hdr">Name</div>
      <div class="cell hdr last-col">Purpose</div>
      <div class="cell dim">Tier 0</div>
      <div class="cell">Base Package — Foundation</div>
      <div class="cell last-col">Pure utilities, abstract contracts, core data model</div>
      <div class="cell dim">Tier 1</div>
      <div class="cell">Shared Package — Common Capabilities</div>
      <div class="cell last-col">Cross-domain components, promoted utilities</div>
      <div class="cell dim">Tier 2</div>
      <div class="cell">Domain Packages — Business Logic</div>
      <div class="cell last-col">Independent domains — no sideways dependencies</div>
      <div class="cell dim last-row">Tier 3</div>
      <div class="cell last-row">Composite Packages — Bundled Products</div>
      <div class="cell last-col last-row">Intentional aggregation of domain packages</div>
    </div>

    <p><strong>Treat every sharing request as an architectural trigger.</strong> The moment a component is needed by a second package, that is your signal to run the decision framework — not to reach for the nearest shortcut. Treat it as a formal decision logged in your Architecture Decision Record, not a fix squeezed into a sprint.</p>

    <p><strong>Version your shared interfaces, not your implementations.</strong> In Tier 0 and Tier 1, define interfaces and abstract contracts. Tier 2 packages provide the concrete implementations. This keeps the dependency graph stable even as individual domain implementations change independently across release cycles.</p>

    <p><strong>The "Would Tier 0 be embarrassed?" test.</strong> Before promoting anything to the base package, ask: <em>"Does this belong in a foundation that every subscriber will always receive, regardless of use case?"</em> If the answer is anything less than a confident yes, Tier 1 is the more appropriate home.</p>

    <p><strong>Keep the dependency graph visible and enforced.</strong> In a growing package suite, an undocumented graph is a liability. Maintain a living diagram showing allowed dependency directions and enforce it in code reviews. Treat it the same way you treat a data model diagram — it is not optional documentation, it is a primary architectural artifact.</p>
  </div>

  <div class="section">
    <div class="section-label">10 — Summary</div>
    <div class="section-title">Summary Reference</div>
    <p class="section-desc">Use this table as a quick reference when evaluating any shared component decision across your packages.</p>

    <div class="data-grid" style="grid-template-columns: 1fr 1.4fr 1fr 1.2fr;">
      <div class="cell hdr">Branch</div>
      <div class="cell hdr">Typical Example</div>
      <div class="cell hdr">Tier Destination</div>
      <div class="cell hdr last-col">Watch Out For</div>

      <div class="cell"><span class="yes">Move to base</span></div>
      <div class="cell">Stateless utility or helper with no domain references</div>
      <div class="cell">Tier 0 — Base Package</div>
      <div class="cell last-col">Over-promoting — base package bloat</div>

      <div class="cell"><span class="yes">Split core + extension</span></div>
      <div class="cell">UI component with shared shell and domain-specific callback</div>
      <div class="cell">Core → Tier 0, Extensions → Tier 2</div>
      <div class="cell last-col">Putting too much logic in the shared base component</div>

      <div class="cell"><span class="partial">Shared package</span></div>
      <div class="cell">Feature-rich integration or cross-cutting capability</div>
      <div class="cell">Tier 1 — Shared Package</div>
      <div class="cell last-col">Creating Tier 1 for a single one-time need</div>

      <div class="cell"><span class="partial">Explicit dependency</span></div>
      <div class="cell">A bundle or suite package aggregating domains by design</div>
      <div class="cell">Tier 3 — Composite Package</div>
      <div class="cell last-col">Using this at Tier 2 without justification</div>

      <div class="cell last-row"><span class="no">Controlled duplication</span></div>
      <div class="cell last-row">Visually similar but semantically distinct small components</div>
      <div class="cell last-row">Stays local — Tier 2 each</div>
      <div class="cell last-col last-row">Letting duplication grow without a re-evaluation trigger</div>
    </div>

    <div class="callout info">
      <strong>Intended audience:</strong> Salesforce Technical Architects and Senior Developers working with multi-package 2GP Unlocked Packages in a growing product suite.
    </div>
  </div>

</div>
`;

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"2gp-dependency-blueprint"},
      ${"2GP Unlocked Package Dependency Structures — Star, Diamond, Mixed & Inverted Funnel — Dependency Resolution Framework"},
      ${"Dependency Structures · Decision Framework · Target Architecture"},
      ${"April 27, 2026"},
      ${["Salesforce", "2GP", "Architecture", "Unlocked Packages"]},
      ${"In a multi-package 2GP world, dependency decisions made today define the maintainability of your entire product suite tomorrow. This blueprint covers the structures where these challenges arise, a repeatable decision framework, and the tiered target architecture to work toward — one component decision at a time."},
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
