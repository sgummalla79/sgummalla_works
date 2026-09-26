import "dotenv/config";
import postgres from "postgres";

const neon = postgres(process.env.NEON_DB_URL!, { ssl: "require" });

const content = `
<div class="doc-header">
  <div class="label">Agent Development · Salesforce Agentforce</div>
  <h1>Building an AI-Powered Agent<br/>A General Framework</h1>
  <div class="subtitle">The Agentforce Development Lifecycle — 5 Phases, Cross-Cutting Principles, and How It Specializes by Department</div>
  <div class="meta-row">
    <span class="meta-tag">Agentforce</span>
    <span class="meta-tag">Atlas Reasoning Engine</span>
    <span class="meta-tag">Agent Development Lifecycle</span>
    <span class="meta-tag">Einstein Trust Layer</span>
    <span class="meta-tag">~12 min read</span>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="section-label">00 — Context</div>
    <div class="section-title">A General Pattern for Agent Development</div>
    <p class="section-desc">Designing and iterating on an AI agent — for example, an HR chatbot that needs to give accurate, empathetic, context-aware responses — is one instance of a general pattern. This article walks through that pattern using Salesforce's own <strong>Agentforce Development Lifecycle</strong>: five phases plus a set of cross-cutting principles, followed by how the lifecycle specializes across departments.</p>
  </div>

  <div class="section">
    <div class="section-label">01 — Lifecycle</div>
    <div class="section-title">The Agentforce Development Lifecycle — 5 Phases</div>

    <div class="flow-steps">
      <div class="flow-step">
        <div class="step-num">1</div>
        <div class="step-content">
          <strong>Ideation &amp; Design</strong>
          <ul>
            <li>Define the agent's purpose, persona, tools, and core decision-making logic before building anything.</li>
            <li>Use a design-first "interview" approach: work through decisions one at a time (data model — custom vs. standard objects, required fields/status values, user permissions/security gates, architecture pattern, Flows vs. Apex) as a decision tree, defaulting sensibly where possible.</li>
            <li>Favor preconfigured templates — common subagents, actions, and variables are already included for typical jobs.</li>
            <li>Map the agent as a graph: nodes represent distinct domains. Most agents work best with 1–5 domain sub-agents (hub-and-spoke rather than one monolithic agent).</li>
          </ul>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">2</div>
        <div class="step-content">
          <strong>Development</strong>
          <ul>
            <li>Build the actions and knowledge base the agent's capabilities need, using Agent Builder (UI) or Agentforce DX (CLI/pro-code).</li>
            <li>Set up a proper project: metadata as files, connected to a scratch org or sandbox — production access is not part of this phase.</li>
            <li>Use a generate → deploy → auto-fix loop: generate the authoring bundle, validate it, deploy backing Flows/Apex before the agent definition, then deploy the agent metadata itself. <code>--json</code> output lets tooling parse and self-correct errors.</li>
            <li>Apply context engineering: give the agent only the instructions, rules, and actions it actually needs — narrow, precise context outperforms a large generic prompt.</li>
            <li>Use deterministic control (Agentforce Script, Flows, Apex, API calls) for anything that must execute in a fixed, unvarying sequence — mandatory steps, calculations, sensitive business rules — rather than leaving it to free-form LLM reasoning.</li>
          </ul>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">3</div>
        <div class="step-content">
          <strong>Testing &amp; Validation</strong>
          <ul>
            <li>Test in layers: smoke tests during development (quick preview sessions sending sample utterances and inspecting the response/trace), then batch regression tests — YAML test specs asserting expected topic/routing, expected actions fired, and expected outcome (graded by an LLM) run across many scenarios at once.</li>
            <li>Simulate real conversations and gather feedback before rollout.</li>
          </ul>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">4</div>
        <div class="step-content">
          <strong>Deployment &amp; Release</strong>
          <ul>
            <li>Package and deploy using standard Salesforce mechanisms — Change Sets or Agentforce DX — for a controlled rollout.</li>
            <li>Publish, then explicitly activate the agent.</li>
            <li>Version agents over time, and commit Agent Script/metadata to source control (Git) for a repeatable history.</li>
          </ul>
        </div>
      </div>
      <div class="flow-step">
        <div class="step-num">5</div>
        <div class="step-content">
          <strong>Monitoring &amp; Tuning</strong>
          <ul>
            <li>After launch, use Agentforce analytics and the Session Trace Data Model to observe real usage: misroutes, action errors, slow actions.</li>
            <li>Follow an observe → reproduce → improve loop: spot a failure in production traces, reproduce it locally, then make a targeted fix and redeploy.</li>
            <li>Trace viewers (e.g., graph-based trace walkthroughs) help show sub-agent handoffs and tool/action calls for debugging.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">02 — Principles</div>
    <div class="section-title">Cross-Cutting Principles</div>

    <div class="callout info">
      <strong>Reliability / determinism</strong>
      Use the most deterministic tool that fits the job — Flow/Apex/API for rigid logic, LLM reasoning only where flexibility is actually needed.
    </div>
    <div class="callout info">
      <strong>Human-controlled architecture</strong>
      Keep a human designer in control of architecture decisions; let tooling handle repetitive implementation, validation, and error-fixing.
    </div>
    <div class="callout info">
      <strong>Source-controlled artifacts</strong>
      Treat agent definitions as versioned, source-controlled artifacts, not one-off configurations.
    </div>
  </div>

  <div class="section">
    <div class="section-label">03 — Architecture</div>
    <div class="section-title">Agentforce Architecture — Before &amp; After the LLM Call</div>
    <p class="section-desc">Sourced from Salesforce's own documentation — Trailhead's Atlas Reasoning Engine module and Einstein Trust Layer "prompt journey," plus the Salesforce Engineering blog. Links are listed under Sources below.</p>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Agentforce High-Level Architecture</h3>
      </div>
      <div class="detail-card-body">
        <img src="https://engineering.salesforce.com/wp-content/uploads/2025/05/image_4c066f.png" alt="Agentforce high-level architecture diagram from Salesforce Engineering" loading="lazy" style="max-width:100%;border-radius:8px;display:block;margin:0 auto;" />
        <p style="font-size:12.5px;color:var(--text-muted);margin-top:12px;text-align:center;">"A look at Agentforce's high-level architecture." — Salesforce Engineering</p>
      </div>
    </div>

    <p>At a high level, the stack has four layers: <strong>Atlas Reasoning Engine</strong> (the reasoning/orchestration core), <strong>Agent Builder / Agentforce Studio</strong> (where the agent is designed), the <strong>Action Layer</strong> (executes Flows/Apex/APIs), and the <strong>Trust Layer</strong> (guardrails wrapped around every step). Atlas itself is a <strong>state machine that traverses the agent's graph</strong> — it executes deterministic nodes as plain code, and only calls out to the LLM at the specific nodes where reasoning is actually needed, running a <strong>Reason → Act → Observe loop</strong> until the user's goal is met.</p>

    <p><strong>Before the LLM request</strong></p>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="step-num">1</div>
        <div class="step-content"><strong>Topic / sub-agent routing</strong><p>The Atlas state machine matches the utterance to the right node in the agent graph — the hub-and-spoke routing described above.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">2</div>
        <div class="step-content"><strong>Secure data retrieval</strong><p>Pulls org data needed to ground the response, strictly within the requesting user's existing permissions and field-level security.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">3</div>
        <div class="step-content"><strong>Dynamic grounding</strong><p>Retrieved records and merge fields populate the prompt template's placeholders with real, current context.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">4</div>
        <div class="step-content"><strong>Semantic search / RAG</strong><p>Retrieves relevant unstructured content — knowledge articles, documents — to ground the answer beyond structured CRM data.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">5</div>
        <div class="step-content"><strong>Data masking</strong><p>Sensitive values are swapped for placeholders before anything leaves Salesforce's trust boundary.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">6</div>
        <div class="step-content"><strong>Prompt defense</strong><p>Guardrail instructions are injected to resist prompt injection and reduce hallucination before the prompt is finalized.</p></div>
      </div>
    </div>

    <p><strong>The LLM call</strong></p>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="step-num">7</div>
        <div class="step-content"><strong>Secure gateway transmission</strong><p>The masked, grounded, defended prompt is sent across a secure gateway to the underlying LLM.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">8</div>
        <div class="step-content"><strong>LLM reasoning</strong><p>The model reasons over the grounded prompt and produces a response or decides on the next action to take.</p></div>
      </div>
    </div>

    <p><strong>After the LLM response</strong></p>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="step-num">9</div>
        <div class="step-content"><strong>Toxicity / safety detection</strong><p>The response is scored for safety before it's allowed to proceed further.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">10</div>
        <div class="step-content"><strong>Data unmasking</strong><p>Placeholders are swapped back for real values now that the response is past the LLM boundary.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">11</div>
        <div class="step-content"><strong>Action execution</strong><p>If the model decided an action is needed, it runs as a deterministic Flow/Apex/API call — not as free-form LLM output.</p></div>
      </div>
      <div class="flow-step">
        <div class="step-num">12</div>
        <div class="step-content"><strong>Response delivery + trace logging</strong><p>The final answer reaches the user, while the full path is captured in Session Trace data for the Monitoring &amp; Tuning phase.</p></div>
      </div>
    </div>

    <p style="font-size:13px;color:var(--text-muted);margin-top:24px;"><strong>Sources</strong></p>
    <ul style="font-size:13px;line-height:1.9;">
      <li><a href="https://trailhead.salesforce.com/content/learn/modules/the-einstein-trust-layer/follow-the-prompt-journey" target="_blank" rel="noopener">Trailhead — Follow the Prompt Journey (Einstein Trust Layer)</a></li>
      <li><a href="https://trailhead.salesforce.com/content/learn/modules/reasoning-in-artificial-intelligence/discover-the-atlas-reasoning-engine" target="_blank" rel="noopener">Trailhead — Discover the Atlas Reasoning Engine</a></li>
      <li><a href="https://engineering.salesforce.com/inside-the-brain-of-agentforce-revealing-the-atlas-reasoning-engine/" target="_blank" rel="noopener">Salesforce Engineering — Inside Agentforce: Revealing the Atlas Reasoning Engine</a></li>
      <li><a href="https://engineering.salesforce.com/how-agentforce-delivers-trusted-extensible-ai-agents-for-enterprise-orchestration/" target="_blank" rel="noopener">Salesforce Engineering — How Agentforce Delivers Trusted, Extensible AI Agents</a></li>
    </ul>
  </div>

  <div class="section">
    <div class="section-label">04 — Specialization</div>
    <div class="section-title">How the Lifecycle Specializes by Department</div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>HR Inquiries Agent</h3>
        <span class="arch-badge badge-vf">HR</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Benefits &amp; Leave, Payroll FAQs, Onboarding — hub-and-spoke rather than one monolithic HR bot</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Policy handbooks, benefits plans, PTO/leave rules by region, payroll FAQs</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Empathetic, plain-language, acknowledges the person's situation before giving policy detail</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">PTO balance lookup and leave-request submission run as Flow/API actions, not free-form LLM math</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Harassment/discrimination complaints, terminations, anything legally sensitive or emotionally charged</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">Employee location, employment type, tenure — since policy often varies by these</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "How many PTO days do I have left?" → answered directly from HRIS data. "My manager keeps yelling at me" → immediately escalated to an HR rep, not answered by the bot.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>IT Support Agent</h3>
        <span class="arch-badge badge-canvas">IT / Helpdesk</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Access &amp; Provisioning, Troubleshooting, Incident Reporting</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Runbooks, past ticket resolutions, system status pages, asset inventory</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Fast, transactional, step-by-step instructions</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">Password reset and ticket creation execute as fixed-sequence actions/API calls, never improvised by the LLM</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Security incidents, access/permission changes, anything touching production systems</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">User's device/OS, role-based access level, current open tickets</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "My VPN won't connect" → walks through standard troubleshooting steps from the runbook. "I think my account was compromised" → immediately escalated to security, no self-service attempt.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Finance / Expense Agent</h3>
        <span class="arch-badge badge-hm">Finance</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Expense Policy Q&amp;A, Reimbursement Status, Budget Lookup</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Expense policy, approved vendor lists, budget/ledger data, reimbursement rules</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Precise, cites the specific policy line being applied</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">Threshold checks ("amount &gt; $X requires approval") enforced as an Apex/Flow business rule, never left to LLM judgment</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Anything involving fraud suspicion, audit questions, or amounts above policy thresholds</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">Employee's cost center, role/approval level, spend history</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "Is a $40 client lunch reimbursable?" → answered directly against expense policy. "Can I expense a $3,000 conference without pre-approval?" → routed to a human approver.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Legal / Contracts Agent</h3>
        <span class="arch-badge badge-lwc">Legal</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Contract Template Lookup, Clause Library, Compliance Check</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Contract templates, standard clause library, past redlines, compliance guidelines</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Careful, hedged, always cites source clause/document rather than asserting</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">Standard-clause substitution pulls verbatim from the approved template library rather than generating language fresh</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Anything involving privilege, litigation, or a deviation from standard contract terms</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">Contract type, counterparty, deal size/risk tier</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "What's our standard NDA mutual confidentiality clause?" → pulled directly from the template library. "Can we accept this counterparty's custom liability clause?" → routed to legal counsel.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Sales Enablement Agent</h3>
        <span class="arch-badge badge-vf">Sales</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Competitive Intel, Pricing Lookup, Deal Support</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Product/pricing sheets, competitive battlecards, past deal notes, CRM opportunity data</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Confident, persuasive but factually grounded — no invented product claims</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">Discount approval limits are Flow-enforced thresholds, not something the LLM negotiates</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Non-standard pricing/discount requests, legal terms, anything requiring a deal desk sign-off</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">The specific deal, prospect industry, deal stage</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "How do we compare to [competitor] on X feature?" → answered from the current battlecard. "Can I offer 40% off?" → routed to deal desk, since that's outside standard discount range.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Customer Support Agent</h3>
        <span class="arch-badge badge-canvas">Customer Support</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Order Status, Returns &amp; Refunds, Known Issues</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Product docs, known-issues list, account/order data, past ticket history</div>
          <div class="cell dim">Tone</div><div class="cell last-col">Patient, apologetic when appropriate, solution-first</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">Refund-threshold rules and order lookups run as API/Flow actions, keeping payout amounts outside the model's discretion</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">Refund/billing disputes above a threshold, angry or repeat-contact customers, safety issues</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">Customer's account, order/subscription status, prior contact history</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "Where's my order?" → answered directly from order-tracking data. "This is my third time contacting you about the same issue" → immediately routed to a human agent.
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-header">
        <h3>Marketing Content Agent</h3>
        <span class="arch-badge badge-hm">Marketing</span>
      </div>
      <div class="detail-card-body">
        <div class="data-grid" style="grid-template-columns: 170px 1fr;">
          <div class="cell dim">Sub-agents</div><div class="cell last-col">Content Drafting, Brand Voice Check, Campaign Performance Lookup</div>
          <div class="cell dim">Data sources</div><div class="cell last-col">Brand guidelines, past approved campaigns, messaging/positioning docs, performance data</div>
          <div class="cell dim">Tone</div><div class="cell last-col">On-brand voice, matches approved messaging exactly for anything public-facing</div>
          <div class="cell dim">Deterministic parts</div><div class="cell last-col">A claim-substantiation gate routes any regulated/comparative claim to review before publish, rather than letting the LLM assert it freely</div>
          <div class="cell dim">Escalate when</div><div class="cell last-col">New product claims, anything regulated (health, finance-adjacent claims), executive-facing content</div>
          <div class="cell dim last-row">Context needed</div><div class="cell last-col last-row">Target channel/audience, campaign brief, brand voice guidelines for that market</div>
        </div>
        <div class="callout success">
          <strong>Example</strong>
          "Draft 5 social captions for this blog post" → generated directly against brand voice guide. "Can we claim this product is '#1 in the industry'?" → routed to legal/comms for claim substantiation.
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">05 — Applying the Framework</div>
    <div class="section-title">Putting It Together</div>
    <div class="callout info">
      For a department-specific version of this pattern (HR, IT, Finance, and so on), the five phases apply in order — Ideation &amp; Design (scope, personas, sub-agent graph), Development (actions, knowledge base, context engineering, deterministic vs. LLM logic), Testing &amp; Validation (smoke tests, batch regression, simulated conversations), Deployment &amp; Release (controlled rollout, versioning, source control), Monitoring &amp; Tuning (trace analytics, observe → reproduce → improve) — with the department-specific detail substituted in at each step. Naming the lifecycle explicitly, and calling out where deterministic Flow/Apex logic is used versus LLM reasoning, keeps the design grounded in Salesforce's own architecture rather than a generic pattern.
    </div>
  </div>

</div>
`;

async function seed() {
  await neon`
    INSERT INTO articles (slug, title, subtitle, date, tags, description, content, published)
    VALUES (
      ${"agentforce-development-lifecycle"},
      ${"Building an AI-Powered Agent — A General Framework"},
      ${"The Agentforce Development Lifecycle — 5 Phases, Cross-Cutting Principles, and How It Specializes by Department"},
      ${"August 1, 2026"},
      ${["Salesforce", "Agentforce", "AI Agents", "Atlas Reasoning Engine", "Agent Development Lifecycle"]},
      ${"A general framework for designing, building, testing, deploying, and monitoring AI agents, mapped to Salesforce's own Agentforce Development Lifecycle — five phases, cross-cutting principles, the Atlas Reasoning Engine's before/after-LLM architecture, and how the lifecycle specializes across HR, IT, Finance, Legal, Sales, Support, and Marketing agents."},
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
  console.log("Article seeded successfully (draft, unpublished)");
  await neon.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
