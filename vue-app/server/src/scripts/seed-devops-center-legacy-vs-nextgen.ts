import "dotenv/config";
import postgres from "postgres";

const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

const content = `
<div class="doc-header">
  <div class="label">Release Engineering · Salesforce DevOps Center</div>
  <h1>DevOps Center: Legacy vs Next-Generation</h1>
  <div class="subtitle">A section-by-section comparison of DevOps Center (Managed Package) and Next-Generation DevOps Center</div>
  <div class="meta-row">
    <span class="meta-tag">Next-Gen: GA, rolling from Apr 22, 2026</span>
    <span class="meta-tag">Legacy: Managed Package, GA</span>
    <span class="meta-tag">Source: help.salesforce.com, release 260</span>
  </div>
</div>

<div class="container">

  <div class="section" id="summary">
    <div class="section-label">00 — Summary</div>
    <div class="section-title">The Short Version</div>
    <p class="section-desc">Before the detail: what each product is, in one card each.</p>

    <div class="option-cards">
      <div class="option-card">
        <span class="oc-badge oc-alt">Legacy — GA</span>
        <h4>DevOps Center (Managed Package)</h4>
        <ul>
          <li>Installed as an AppExchange managed package into a dedicated Hub org</li>
          <li>Mature, generally available, in production use today</li>
          <li>Authenticates per environment via Named Credentials</li>
          <li>Standard Lightning UI; conflict resolution is manual</li>
          <li>No built-in AI assistance</li>
        </ul>
      </div>
      <div class="option-card primary">
        <span class="oc-badge oc-primary">Next-Gen — GA</span>
        <h4>Next-Generation DevOps Center</h4>
        <ul>
          <li>Native platform feature — no install required</li>
          <li>Generally available, rolling out on a rolling basis since April 22, 2026 (ran as a Beta from Feb 11 to Apr 2026)</li>
          <li>Authenticates via DX Inspector's connect flow</li>
          <li>New UI on Salesforce Lightning Design System 2</li>
          <li>AI-native: Agentforce + MCP tools resolve conflicts and deployment failures</li>
        </ul>
      </div>
    </div>

    <div class="callout info">
      <strong>Both products are GA</strong>
      Next-Generation DevOps Center is generally available, rolling out on a rolling basis since April 22, 2026 — it is no longer in Beta. The GA release added a few capabilities beyond what beta had, including Bitbucket support, data deployment, and the ability to combine work items to resolve conflicts. "Legacy" below refers to the original DevOps Center (Managed Package), which remains GA and separately maintained.
    </div>
    <div class="callout danger">
      <strong>Most important caveat</strong>
      Switching doesn't migrate existing work items, projects, or pipelines. You rebuild them in the new system. Salesforce says a migration pathway is being worked on, but none exists in current documentation.
    </div>
  </div>

  <div class="section" id="architecture">
    <div class="section-label">01 — Architecture</div>
    <div class="section-title">Architecture &amp; Deployment Model</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Delivery</div><div class="cell">Installed AppExchange managed package</div><div class="cell last-col">Built into the platform, no package</div>
          <div class="cell dim">Hub org concept</div><div class="cell">Package installed into a dedicated "Hub" org</div><div class="cell last-col">Same "Hub org" concept, but it's a feature toggle, not a package install</div>
          <div class="cell dim">Data storage</div><div class="cell">Custom object records delivered by the package</div><div class="cell last-col">Native platform data model</div>
          <div class="cell dim">Sandbox as Hub org</div><div class="cell">Not allowed — a refresh would wipe all project data</div><div class="cell last-col dim">No change — same restriction applies</div>
          <div class="cell dim">Extensibility</div><div class="cell">Only via 2GP extension packages for ISVs/partners</div><div class="cell last-col">Built on SLDS 2 — themeable, flexible layouts</div>
          <div class="cell dim last-row">Mutual exclusivity</div><div class="cell last-row">Only one product can be on at a time in a given org</div><div class="cell last-col last-row dim">No change — enabling next-gen requires disabling the managed package first</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="setup">
    <div class="section-label">02 — Setup</div>
    <div class="section-title">Installation &amp; Enablement</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Permission to set up</div><div class="cell">"Download AppExchange Packages"</div><div class="cell last-col">DevOps Center Admin</div>
          <div class="cell dim">Getting started</div><div class="cell">Installed into a supported org edition from the DevOps Center Setup page</div><div class="cell last-col">"Instant setup" — turned on from Setup, no package download or install wizard</div>
          <div class="cell dim">Professional Edition</div><div class="cell">Needs the API Access add-on purchased through your AE, or installation fails</div><div class="cell last-col">Same edition requirement applies (API access add-on)</div>
          <div class="cell dim">Terms acceptance</div><div class="cell">Not called out separately</div><div class="cell last-col">Setup page labelled <code>DevOps Center</code> (previously <code>DevOps Center (Beta)</code> during the beta period); requires accepting Salesforce DX Tools terms and conditions</div>
          <div class="cell dim">Upgrades</div><div class="cell">Package upgrades happen automatically</div><div class="cell last-col">N/A — native feature, no package versioning</div>
          <div class="cell dim last-row">Setup flow</div><div class="cell last-row">Users → source control → project → environments → pipeline → work items</div><div class="cell last-col last-row">Enable → switch over (if applicable) → users/licenses → permission sets → source control → <code>.forceignore</code> → project → pipeline → work items → optional Agentforce Vibes IDE</div>
        </div>
        <div class="callout info" style="margin-top:16px;margin-bottom:0;">Both require Professional Edition (with API access) or Enterprise / Performance / Unlimited / Developer Edition, in Lightning Experience.</div>
      </div>
    </div>
  </div>

  <div class="section" id="licensing">
    <div class="section-label">03 — Licensing</div>
    <div class="section-title">Licensing &amp; User Provisioning</div>
    <p class="section-desc">One of the most consequential differences, with direct cost impact.</p>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Minimum license</div><div class="cell">Identity Only or Salesforce Limited Access – Free</div><div class="cell last-col">Full Salesforce license, Standard User profile — for every role</div>
          <div class="cell dim">Adding users</div><div class="cell">Assign a DevOps Center permission set on top of the minimal license</div><div class="cell last-col">Setup → Users → New User → select license + Standard User profile → "Generate passwords and notify user via email" → assign permission sets</div>
          <div class="cell dim">Onboarding</div><div class="cell">Not detailed as an emailed invite flow</div><div class="cell last-col">Users get an emailed invite with a generated password; Salesforce recommends they wait for admin confirmation before first login</div>
          <div class="cell dim last-row">Extra permission to commit</div><div class="cell last-row">Not called out separately</div><div class="cell last-col last-row">Committing via DX Inspector also requires Customize Application in the dev org, plus DevOps Center User in the Hub org</div>
        </div>
        <div class="callout warning" style="margin-top:16px;margin-bottom:0;">
          <strong>Cost implication</strong>
          Next-gen needs a full Standard User license per participant, not a free Identity-Only or Limited Access license. Teams with large rosters should budget for a different licensing footprint when migrating.
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="auth">
    <div class="section-label">04 — Authentication</div>
    <div class="section-title">Authentication &amp; Environment Connections</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Mechanism</div><div class="cell">Each environment gets a Named Credential, auto-created by the package</div><div class="cell last-col">DX Inspector's "Connect DevOps Center" action authenticates directly to the source repository</div>
          <div class="cell dim">Naming pattern</div><div class="cell"><code>&lt;environmentRecordID&gt;_&lt;environmentName&gt;_&lt;sequentialNumber&gt;</code></div><div class="cell last-col">No equivalent named-credential list</div>
          <div class="cell dim">Fragility to domain changes</div><div class="cell">Breaks when a sandbox's My Domain URL format changes (e.g. Enhanced Domains rollout) — admins must manually edit each affected credential and reauthenticate</div><div class="cell last-col">Not documented as having this failure mode</div>
          <div class="cell dim">Re-authenticating when switching products</div><div class="cell dim">Not applicable — this step only applies when moving to next-gen</div><div class="cell last-col">DX Inspector → Change Management → "Remove DevOps Center Connection," then "Sign in to DevOps Center" with next-gen credentials</div>
          <div class="cell dim">Post-switch cleanup</div><div class="cell dim">Not applicable — nothing to clean up while staying on legacy</div><div class="cell last-col">Old Named Credentials aren't auto-removed — delete records matching <code>&lt;ID&gt;_&lt;environment-name&gt;_&lt;number&gt;</code> in Setup manually</div>
          <div class="cell dim last-row">MCP security</div><div class="cell last-row">—</div><div class="cell last-col last-row">Docs cite "encrypted authentication files" preventing data leaks and allowing only approved org access for MCP tooling</div>
        </div>
        <div class="callout info" style="margin-top:16px;margin-bottom:0;">Neither product's docs name MFA specifically as a forcing function for migration. The documented authentication changes are architectural — how environments connect and how fragile that connection is to domain/URL changes — not an MFA mandate.</div>
      </div>
    </div>
  </div>

  <div class="section" id="ui">
    <div class="section-label">05 — Interface</div>
    <div class="section-title">User Interface</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Foundation</div><div class="cell">Standard Lightning Experience app, click-based</div><div class="cell last-col">Modern, extensible UI built on SLDS 2</div>
          <div class="cell dim">Customization</div><div class="cell">Fixed layout, not built for team-specific theming</div><div class="cell last-col">Supports themes and flexible layouts to match team governance models</div>
          <div class="cell dim last-row">Home page</div><div class="cell last-row">—</div><div class="cell last-col last-row">Surfaces projects, work items, and activity history together</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="sourcecontrol">
    <div class="section-label">06 — Source Control</div>
    <div class="section-title">Source Control Support</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 230px 1fr 1fr;">
          <div class="cell hdr">Provider</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">GitHub.com / Enterprise Cloud</div><div class="cell">Supported</div><div class="cell last-col dim">No change — supported</div>
          <div class="cell dim">GitHub Enterprise Server (self-hosted)</div><div class="cell">Not supported</div><div class="cell last-col dim">No change — not supported</div>
          <div class="cell dim last-row">Bitbucket Cloud</div><div class="cell last-row">Supported, in Beta</div><div class="cell last-col last-row">Supported as a first-class option — added as part of the move to GA</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="environments">
    <div class="section-label">07 — Environments</div>
    <div class="section-title">Environment Support</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Development environments</div><div class="cell">Source-tracked only — Developer sandbox, Developer Pro sandbox, or scratch org</div><div class="cell last-col">Adds support for <strong>non-source-tracked</strong> environments too</div>
          <div class="cell dim last-row">Best fit</div><div class="cell last-row">Standard source-tracked workflows</div><div class="cell last-col last-row">Complex data configuration workflows where source tracking isn't enabled</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="pipeline">
    <div class="section-label">08 — Pipelines</div>
    <div class="section-title">Projects, Pipelines &amp; Work Items</div>
    <p class="section-desc">Both share the same core model: a project bundles work items, a source control pointer, environments, and a pipeline. The mechanics differ in a few places.</p>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Work item numbering</div><div class="cell">Continues existing sequence</div><div class="cell last-col">Restarts at <code>WI-000001</code></div>
          <div class="cell dim">Promotion model</div><div class="cell">Stage promotion with a "combine work items" fallback</div><div class="cell last-col">Stage promotion plus custom promotion (individual work items), with its own combine-work-items flow</div>
          <div class="cell dim">External merges</div><div class="cell">Complete manually via DevOps Center or Salesforce CLI</div><div class="cell last-col">Active detection of changes merged directly into a stage's branch</div>
          <div class="cell dim">Dev environment sync</div><div class="cell">Tracks differences between dev environment and first pipeline stage</div><div class="cell last-col">Adds an explicit "back sync" feature to pull pipeline changes into the dev environment</div>
          <div class="cell dim last-row">VCS sync auditing</div><div class="cell last-row">Not called out separately</div><div class="cell last-col last-row">Dedicated capability for detecting drift between pipeline and repo</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="conflict">
    <div class="section-label">09 — Conflicts</div>
    <div class="section-title">Conflict Detection &amp; Resolution</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 190px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy — manual first</div><div class="cell hdr last-col">Next-Gen — AI-assisted, native</div>
          <div class="cell dim">Detection</div><div class="cell">Warns during promotion when work items touch the same file</div><div class="cell last-col dim">No change — same detection, now surfaced inline with an error notification</div>
          <div class="cell dim">Shared/dependent components</div><div class="cell">Offers to combine work items sharing components/dependencies</div><div class="cell last-col">Same combine-work-items concept, as a next-gen-specific flow for custom promotion</div>
          <div class="cell dim">Primary resolution path</div><div class="cell">Fix manually, or promote the dependent item first</div><div class="cell last-col">"Resolve with Agentforce" button launches Agentforce Vibes IDE with the error and context preloaded</div>
          <div class="cell dim">Who can resolve</div><div class="cell">Typically requires someone comfortable editing source control directly</div><div class="cell last-col">Low-code admins work conversationally; developers can also drive it via MCP tools</div>
          <div class="cell dim last-row">Unresolvable branch conflicts</div><div class="cell last-row">Fixed directly in source control, or via a separate, bolted-on MCP tool</div><div class="cell last-col last-row">Same source-control fallback, with native AI assistance layered in</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="ai">
    <div class="section-label">10 — AI Tools</div>
    <div class="section-title">AI, Agentforce &amp; MCP Tools</div>
    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Next-gen-native capability</h3>
        <span class="arch-badge badge-hm">Next-gen only</span>
      </div>
      <div class="detail-card-body">
        <p><strong>Legacy</strong> has a bolted-on capability — merge conflict resolution via MCP tools, accessed through Agentforce Vibes in your IDE — but it sits on top of an otherwise manual workflow.</p>
        <p><strong>Next-gen</strong> treats AI as core, via the Salesforce DX MCP Server and DevOps Center MCP tools:</p>
        <ul>
          <li>Work item lifecycle management end-to-end via natural language</li>
          <li>Merge conflict resolution ("Resolve with Agentforce")</li>
          <li>Deployment failure resolution — MCP tools analyze logs and suggest fixes</li>
          <li>Encrypted authentication files for secure, approved-only org access</li>
          <li>Requires an MCP-enabled IDE (Agentforce Vibes IDE or VS Code) plus a client like the Agentforce Vibes Extension</li>
        </ul>
        <div class="callout warning" style="margin-bottom:0;">
          <strong>Cost note</strong>
          Salesforce states DevOps Center MCP tools "may be used by, or in connection with, tools ... that consume paid credits or entitlements." Since AI resolution is core to next-gen, this can carry a metered cost that legacy's manual workflow doesn't.
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="ide">
    <div class="section-label">11 — IDE</div>
    <div class="section-title">IDE Integration &amp; DX Inspector</div>
    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Next-gen only</h3>
        <span class="arch-badge badge-hm">Next-gen only</span>
      </div>
      <div class="detail-card-body">
        <p><strong>DX Inspector is next-generation only.</strong> It connects a sandbox, scratch org, or Developer Edition org directly to the DevOps Center project so you never leave the org you're building in:</p>
        <ul>
          <li>A Change Management tab showing all source-tracked changes</li>
          <li>Create work items, commit metadata, open change requests without switching tabs</li>
          <li>Real-time sync back to DevOps Center</li>
          <li>Manual metadata addition for files source tracking misses</li>
          <li>Integration with Agentforce Vibes IDE / VS Code</li>
        </ul>
        <p style="margin-bottom:0;">Legacy has no equivalent — work happens by logging into the Hub org's DevOps Center app directly.</p>
      </div>
    </div>
  </div>

  <div class="section" id="data">
    <div class="section-label">12 — Data</div>
    <div class="section-title">Data (Not Just Metadata) Support</div>
    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Next-gen only</h3>
        <span class="arch-badge badge-hm">Next-gen only</span>
      </div>
      <div class="detail-card-body">
        <p style="margin:0;">Next-gen introduces "Data Commit and Deployment" — moving configuration data alongside metadata in the same commit-and-deploy flow, within a single work item, to keep dependencies intact. Legacy is scoped to metadata/component changes only, with no equivalent.</p>
      </div>
    </div>
  </div>

  <div class="section" id="metrics">
    <div class="section-label">13 — Metrics</div>
    <div class="section-title">DORA Metrics &amp; Activity History</div>
    <div class="detail-card">
      <div class="detail-card-header">
        <h3>DORA metrics — next-gen only</h3>
        <span class="arch-badge badge-hm">Next-gen only</span>
      </div>
      <div class="detail-card-body">
        <p>Available on the project record page for up to 90 days:</p>
        <ul>
          <li>Promotions to Production — count promoted in the selected range</li>
          <li>Average Lead Time — first commit to final promotion to production</li>
          <li>Change Failure Rate — percentage of promotions that failed or needed a fix</li>
        </ul>
        <p>Watching 30-day trends rather than single-day spikes, cross-referenced with Activity History for root causes, keeps these numbers useful rather than noisy.</p>
        <p style="margin-bottom:0;"><strong>Activity History</strong> (commits, promotions, syncs, failures) exists in both products — not next-gen exclusive.</p>
      </div>
    </div>
  </div>

  <div class="section" id="availability">
    <div class="section-label">14 — Availability</div>
    <div class="section-title">Editions &amp; Availability</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 230px 1fr 1fr;">
          <div class="cell hdr">Aspect</div><div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell dim">Core editions</div><div class="cell">Lightning Experience in Professional (with API access add-on), Enterprise, Performance, Unlimited, Developer</div><div class="cell last-col dim">No change — same edition requirements</div>
          <div class="cell dim">Government Cloud Plus</div><div class="cell">Available as interoperable — can send data outside the authorization boundary, requires a conversation with your Account Executive</div><div class="cell last-col dim">No change — same GCP terms apply</div>
          <div class="cell dim">EU Operating Zone</div><div class="cell">Not available</div><div class="cell last-col dim">No change — also not available; supported in EU orgs outside EU OZ under standard terms</div>
          <div class="cell dim last-row">Release status</div><div class="cell last-row">Generally available</div><div class="cell last-col last-row">Generally available, rolling out on a rolling basis since April 22, 2026</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="migration">
    <div class="section-label">15 — Migration</div>
    <div class="section-title">Switching / Migration Path</div>
    <div class="callout danger">
      <strong>No data migration today</strong>
      Existing work items, projects, and pipelines aren't carried over when you turn on next-gen. You rebuild from zero. A migration pathway is reportedly in development, but nothing is documented as available now.
    </div>
    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Steps to switch</h3>
        <span class="arch-badge badge-hm">Next-gen only</span>
      </div>
      <div class="detail-card-body">
        <div class="flow-steps">
          <div class="flow-step"><div class="step-num">1</div><div class="step-content"><p style="margin:0;">From Setup, search <code>DevOps Center</code> and open the DevOps Center Setup page.</p></div></div>
          <div class="flow-step"><div class="step-num">2</div><div class="step-content"><p style="margin:0;">Turn off <code>DevOps Center Managed Package</code>.</p></div></div>
          <div class="flow-step"><div class="step-num">3</div><div class="step-content"><p style="margin:0;">Turn on <code>DevOps Center</code> (next-gen).</p></div></div>
          <div class="flow-step"><div class="step-num">4</div><div class="step-content"><p style="margin:0;">In your dev environment, open DX Inspector → Change Management.</p></div></div>
          <div class="flow-step"><div class="step-num">5</div><div class="step-content"><p style="margin:0;">Select "Remove DevOps Center Connection" to clear the old connection.</p></div></div>
          <div class="flow-step"><div class="step-num">6</div><div class="step-content"><p style="margin:0;">From the banner, click "Sign in to DevOps Center."</p></div></div>
          <div class="flow-step"><div class="step-num">7</div><div class="step-content"><p style="margin:0;">Enter your next-generation DevOps Center credentials.</p></div></div>
          <div class="flow-step"><div class="step-num">8</div><div class="step-content"><p style="margin:0;">(Cleanup) In Setup → Named Credentials, delete leftover records matching <code>&lt;ID&gt;_&lt;environment-name&gt;_&lt;number&gt;</code>.</p></div></div>
        </div>
        <p style="margin-top:14px;margin-bottom:0;">Requires the DevOps Center Admin permission.</p>
      </div>
    </div>
  </div>

  <div class="section" id="feedback">
    <div class="section-label">16 — Feedback</div>
    <div class="section-title">Feedback Channels</div>
    <div class="detail-card">
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="cell hdr">Legacy</div><div class="cell hdr last-col">Next-Gen</div>
          <div class="cell last-row">DevOps Center Trailblazer Community group</div><div class="cell last-col last-row">Public GitHub issue tracker (<code>forcedotcom/NextGeneration-DevOpsCenter</code>) — a more developer-centric channel</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="sources">
    <div class="section-label">17 — Sources</div>
    <div class="section-title">Sources</div>
    <p class="section-desc">All content pulled directly from Salesforce Help (release cycle 260).</p>
    <ul style="font-size:13px;line-height:1.9;">
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_overview.htm&release=260&type=5" target="_blank" rel="noopener">Manage and Release Changes with DevOps Center</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.next_generation_devops_center.htm&release=260&type=5" target="_blank" rel="noopener">Next Generation DevOps Center</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.next_gen_devops_center_setup_considerations.htm&release=260&type=5" target="_blank" rel="noopener">Considerations to Set Up Next Generation DevOps Center</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.next_gen_devops_center_setup.htm&release=260&type=5" target="_blank" rel="noopener">Set Up Next Generation DevOps Center</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_managed_package_to_next_gen.htm&release=260&type=5" target="_blank" rel="noopener">Switch from Managed Package to Next-Gen</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_get_started.htm&release=260&type=5" target="_blank" rel="noopener">DevOps Center (Managed Package) — Get Started</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_setup.htm&release=260&type=5" target="_blank" rel="noopener">Install and Configure DevOps Center (Managed Package)</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_add_team_members.htm&release=260&type=5" target="_blank" rel="noopener">Add Team Members as Users in the Hub Org</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_dx_inspector.htm&release=260&type=5" target="_blank" rel="noopener">DX Inspector</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_mcp_tools.htm&release=260&type=5" target="_blank" rel="noopener">DevOps Center MCP Tools</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_promotion_conflict_detection.htm&release=260&type=5" target="_blank" rel="noopener">Conflict Detection and Resolution</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_next_gen_resolve_conflict.htm&release=260&type=5" target="_blank" rel="noopener">Resolve Merge Conflicts in Next-Gen</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_dora_metrics.htm&release=260&type=5" target="_blank" rel="noopener">Measure Project Performance with DORA Metrics</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_basics_intro.htm&release=260&type=5" target="_blank" rel="noopener">DevOps Center Basics</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=release-notes.rn_next_generation_devops_center.htm&release=260&type=5" target="_blank" rel="noopener">Release Notes: Next Generation DevOps Center (Beta, Feb 2026)</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=release-notes.rn_devops_center_next_gen.htm&release=260&type=5" target="_blank" rel="noopener">Release Notes: Next Generation DevOps Center (Generally Available, Apr 2026)</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_troubleshooting.htm&release=260&type=5" target="_blank" rel="noopener">Troubleshoot DevOps Center Errors</a></li>
      <li><a href="https://help.salesforce.com/s/articleView?id=platform.devops_center_uninstall_named_creds.htm&release=260&type=5" target="_blank" rel="noopener">Delete DevOps Center Named Credentials</a></li>
    </ul>
  </div>

</div>
`;

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"devops-center-legacy-vs-nextgen"},
      ${"DevOps Center: Legacy vs Next-Generation"},
      ${"A section-by-section comparison of DevOps Center (Managed Package) and Next-Generation DevOps Center"},
      ${"August 30, 2026"},
      ${["Salesforce", "DevOps Center", "Release Engineering", "Agentforce", "MCP"]},
      ${"A section-by-section comparison of Salesforce DevOps Center (Managed Package, GA) and Next-Generation DevOps Center (GA since April 22, 2026) — architecture, setup, licensing, authentication, source control, pipelines, conflict resolution, AI/MCP tooling, and migration path."},
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
