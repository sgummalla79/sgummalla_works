const html = `
<div class="doc-header">
  <div class="label">Technical Architecture Reference</div>
  <h1>Third-Party Widget Integration<br>Salesforce Experience Cloud</h1>
  <div class="subtitle">LWC · Visualforce · Canvas — Capabilities, Constraints &amp; Architecture Guidance</div>
  <div class="meta-row">
    <span class="meta-tag">Platform: Experience Cloud</span>
    <span class="meta-tag">Release: Spring '26</span>
    <span class="meta-tag">Runtimes: LWR (default) · Aura (legacy)</span>
    <span class="meta-tag">Security: LWS · Trusted URLs</span>
    <span class="meta-tag">Widget: External Third-Party (iframe-based)</span>
  </div>
</div>

<div class="container">

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 00 — FRAMEWORK CONTEXT                                                   -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">00 — Framework Context</div>
  <div class="section-title">LWR vs Aura — Know Which Runtime Your Site Uses</div>
  <p class="section-desc">
    As of Spring '26, Experience Cloud supports two distinct site runtimes. They differ in security architecture,
    LWS behaviour, and CSP enforcement. Every statement in this document about LWC constraints applies to
    <strong>both runtimes</strong> unless explicitly noted otherwise.
  </p>

  <div class="data-grid" style="grid-template-columns: 1.4fr 1fr 1fr;">

    <div class="cell hdr">Dimension</div>
    <div class="cell hdr center">LWR (Lightning Web Runtime)</div>
    <div class="cell hdr center last-col">Aura (legacy)</div>

    <div class="cell dim">Status in Spring '26</div>
    <div class="cell center"><span class="yes">Default for new sites</span><span class="note-small">All new EC sites created on LWR</span></div>
    <div class="cell center last-col"><span class="partial">Still supported</span><span class="note-small">Existing Aura sites continue to work; dynamic redirects added in Spring '26</span></div>

    <div class="cell dim">Security sandbox</div>
    <div class="cell center">LWS — site-level setting in Experience Builder<span class="note-small">Org-level LWS toggle in Session Settings has <strong>no effect</strong> on LWR sites</span></div>
    <div class="cell center last-col">Lightning Locker (default) or LWS if org-level toggle is on<span class="note-small">LWS for Aura is <strong>Beta</strong> — not GA. Locker uses SecureWindow; LWS uses membrane proxies. Test thoroughly before enabling LWS on Aura in production.</span></div>

    <div class="cell dim">LWS global object exposure</div>
    <div class="cell center"><span class="yes">Globals exposed directly</span><span class="note-small"><code>window</code>, <code>document</code>, element globals are accessible without secure wrappers — within namespace sandbox only</span></div>
    <div class="cell center last-col"><span class="partial">Wrapped via proxy</span><span class="note-small">SecureWindow / membrane proxies wrap all globals</span></div>

    <div class="cell dim">postMessage with external cross-origin iframe</div>
    <div class="cell center"><span class="no">✗ Still broken</span><span class="note-small">Namespace sandbox ≠ external iframe origin; cross-origin postMessage still misrouted</span></div>
    <div class="cell center last-col"><span class="no">✗ Broken</span><span class="note-small">Proxy window ≠ real window; same root cause</span></div>

    <div class="cell dim">LWS API distortion rules (Spring '26)</div>
    <div class="cell center"><span class="partial">Updated</span><span class="note-small">Spring '26 revised distortion rules — review component behaviour after upgrade</span></div>
    <div class="cell center last-col"><span class="partial">Unchanged</span><span class="note-small">Locker rules unchanged; LWS-on-Aura follows org-level rules</span></div>

    <div class="cell dim">Head Markup control</div>
    <div class="cell center"><span class="yes">✓ Full control</span><span class="note-small">Can view and edit the <strong>default</strong> built-in markup (meta charset, title tag, SLDS stylesheet links) AND inject custom scripts/styles. Default markup is exposed in the Head Markup window.</span></div>
    <div class="cell center last-col"><span class="partial">✓  Inject only</span><span class="note-small">Can inject additional custom scripts and stylesheets via the Head Markup window. The Salesforce-generated default markup (meta charset, title, stylesheet links) is <strong>not exposed</strong> — it cannot be viewed or edited. Script injection itself works identically to LWR.</span></div>

    <div class="cell dim last-row">Visualforce Page component in Experience Builder</div>
    <div class="cell center last-row"><span class="no">✗ Not available</span><span class="note-small">LWR is LWC-only. VF pages are accessible via <code>vforcesite</code> URL path but cannot be dragged into the layout. Overlay requires a custom LWC wrapper iframe or Head Markup injection.</span></div>
    <div class="cell center last-col last-row"><span class="yes">✓ Native component</span><span class="note-small">Drag-and-drop VF Page component available in Experience Builder</span></div>

  </div>

  <div class="callout warning">
    <strong>The postMessage problem exists on both runtimes.</strong> Although LWR's LWS exposes
    <code>window</code> globals directly within a namespace sandbox, an external third-party iframe
    is a cross-origin browsing context — outside any Salesforce namespace entirely. Messages posted
    from the iframe arrive at the real browser <code>window</code>, not the namespace-scoped object
    the LWC component holds. The widget communication failure described in Section 02 applies equally
    to LWR and Aura sites.
  </div>
</div>

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 01 — CONTEXT                                                             -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">01 — Context</div>
  <div class="section-title">Core Requirements for Any External Third-Party Widget</div>
  <p class="section-desc">
    Most third-party widgets delivered as an embeddable script share the same five hard requirements.
    Each requirement constrains which Salesforce integration mechanism can actually support it.
  </p>

  <div class="data-grid" style="grid-template-columns: 1.9fr 1fr 1fr 1fr;">

    <div class="cell hdr">Requirement</div>
    <div class="cell hdr center">LWC</div>
    <div class="cell hdr center">Visualforce</div>
    <div class="cell hdr center last-col">Canvas</div>

    <div class="cell dim">Load external JS bundle from a trusted domain at runtime</div>
    <div class="cell center">
      <span class="no">✗ No</span>
      <span class="note-small"><code>loadScript</code> is a CSP requirement to use static resources only — external domain URLs are not supported. Static resources are served from Salesforce's own domain (5MB limit applies).</span>
    </div>
    <div class="cell center">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Standard &lt;script src&gt; in VF page head</span>
    </div>
    <div class="cell center last-col">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Script runs on your own server-rendered page</span>
    </div>

    <div class="cell dim">Execute that script outside the LWS sandbox</div>
    <div class="cell center">
      <span class="no">✗ No</span>
      <span class="note-small">All LWC code — including loadScript — runs inside LWS compartment</span>
    </div>
    <div class="cell center">
      <span class="yes">✓ Yes</span>
      <span class="note-small">VF iframe is a completely separate browsing context</span>
    </div>
    <div class="cell center last-col">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Canvas iframe is a separate browsing context</span>
    </div>

    <div class="cell dim">window.postMessage works correctly (widget ↔ host page events, minimize/maximize)</div>
    <div class="cell center">
      <span class="partial">✓  Conditional</span>
      <span class="note-small">Broken without Trusted Mode (proxy window ≠ real window). Works correctly with Trusted Mode enabled on a static-resource bundle.</span>
    </div>
    <div class="cell center">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Real window inside VF iframe context</span>
    </div>
    <div class="cell center last-col">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Canvas JS SDK is postMessage-based; works correctly</span>
    </div>

    <div class="cell dim">position: fixed floating button that overlays the full EC page</div>
    <div class="cell center">
      <span class="no">✗ No</span>
      <span class="note-small">Script execution is broken anyway — moot</span>
    </div>
    <div class="cell center">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Full-screen transparent iframe overlay; native behaviour</span>
    </div>
    <div class="cell center last-col">
      <span class="partial">✓ Partial</span>
      <span class="note-small">Canvas iframe is a layout component; overlay needs a workaround</span>
    </div>

    <div class="cell dim last-row">Per-user access token fetched from the server and passed to the widget on mount</div>
    <div class="cell center last-row">
      <span class="partial">✓ Partial</span>
      <span class="note-small">@wire can fetch a token, but the widget cannot consume it across the LWS boundary</span>
    </div>
    <div class="cell center last-row">
      <span class="yes">✓ Yes</span>
      <span class="note-small">Apex controller + {!mergeField} — server-rendered, no async step</span>
    </div>
    <div class="cell center last-col last-row">
      <span class="yes">✓✓ Yes</span>
      <span class="note-small">Signed Request — cleaner; no Apex needed</span>
    </div>

  </div>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 02 — LWS ROOT CAUSE                                                      -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">02 — Root Cause</div>
  <div class="section-title">Why LWC + External loadScript Doesn't Work — and the Conditional Path via Trusted Mode</div>
  <p class="section-desc">
    On <strong>Aura sites</strong>, LWS wraps all globals in membrane proxies — components never touch real
    browser objects. On <strong>LWR sites</strong>, LWS is less restrictive: <code>window</code>,
    <code>document</code>, and element globals are exposed directly within the namespace sandbox, without
    secure wrappers. However, neither model solves the external widget problem. A third-party iframe is
    a cross-origin browsing context that sits entirely outside the Salesforce namespace — no amount of
    relaxed global access inside the LWC compartment bridges that boundary.
  </p>

  <pre class="lws-diagram"><span class="c-green">Browser Tab  ──  Real window (global)
│
</span><span class="c-red">├── LWS Layer  ──  Initialises before any LWC executes
│              ──  Aura site:    membrane proxies wrap window, document, all globals
│              ──  LWR site:    globals exposed directly within namespace sandbox (no wrappers)
│              ──  Spring '26:  LWS API distortion rules updated — review component behaviour
│
</span><span class="c-purple">│   ├── LWC Component A        →  sees: namespace-scoped window (proxied on Aura; direct on LWR)
│   ├── LWC Component B        →  sees: namespace-scoped window (proxied on Aura; direct on LWR)
│   └── loadScript(widget.js)  →  static resource only (CSP requirement); executes inside namespace sandbox
</span><span class="c-red">│
</span><span class="c-blue">└── Widget iframe  ──  Cross-origin browsing context; OUTSIDE all Salesforce namespaces
                       posts messages to the REAL browser window.parent

</span><span class="c-broken">  ✗  Aura:  proxied window.addEventListener('message', handler)  ≠  real window iframe posts to
  ✗  LWR:   namespace-scoped window.addEventListener(...)       ≠  real window iframe posts to
  ✗  Both:  loadScript runs inside the namespace — cross-origin iframe is outside it entirely

</span><span class="c-muted">  // On LWR, LWS is controlled per-site in Experience Builder; org-level Session Settings toggle has no effect.
  // eval(), Function(), dynamic script injection, frame reference tricks — all intercepted on both runtimes.</span></pre>

  <div class="data-grid" style="grid-template-columns: 1.6fr 0.9fr 2fr;">

    <div class="cell hdr">Operation</div>
    <div class="cell hdr center">Works under LWS?</div>
    <div class="cell hdr last-col">Reason</div>

    <div class="cell dim"><code>loadScript</code> — fetches and executes the bundle</div>
    <div class="cell center"><span class="partial">✓ Static only</span></div>
    <div class="cell last-col"><code>loadScript</code> is a CSP requirement to use Salesforce static resources — external domain URLs are not supported. Loading from static resource works; loading from an external URL is not an official supported pattern.</div>

    <div class="cell dim">Widget mount function is callable</div>
    <div class="cell center"><span class="yes">✓ Works</span></div>
    <div class="cell last-col">Function definition runs fine inside the compartment</div>

    <div class="cell dim">Widget iframe renders and displays</div>
    <div class="cell center"><span class="yes">✓ Works</span></div>
    <div class="cell last-col">iframe creation is not blocked by LWS</div>

    <div class="cell dim">Basic chat over WebSocket</div>
    <div class="cell center"><span class="yes">✓ Works</span></div>
    <div class="cell last-col">WebSocket connections are not proxied</div>

    <div class="cell dim"><code>window.postMessage</code> — host page → widget iframe</div>
    <div class="cell center"><span class="no">✗ Broken</span><span class="note-small">Without Trusted Mode</span></div>
    <div class="cell last-col">Proxy window ≠ real window; message never arrives at the iframe. With Trusted Mode enabled, real window access is restored and postMessage works.</div>

    <div class="cell dim"><code>window.addEventListener('message', handler)</code></div>
    <div class="cell center"><span class="no">✗ Broken</span><span class="note-small">Without Trusted Mode</span></div>
    <div class="cell last-col">Listener registers on the proxy; the iframe posts to the real window. Fixed by Trusted Mode.</div>

    <div class="cell dim">Minimize / maximize toggle</div>
    <div class="cell center"><span class="no">✗ Broken</span><span class="note-small">Without Trusted Mode</span></div>
    <div class="cell last-col">Depends on a postMessage round-trip between host and iframe. Works with Trusted Mode.</div>

    <div class="cell dim last-row">Injecting host page context into the widget (e.g. record ID, user data)</div>
    <div class="cell center last-row"><span class="no">✗ Broken</span><span class="note-small">Without Trusted Mode</span></div>
    <div class="cell last-col last-row">Depends on postMessage from host into widget iframe. Works with Trusted Mode.</div>

  </div>

  <div class="callout danger">
    <strong>Without Trusted Mode, there is no supported escape path from LWS for external URLs.</strong> <code>eval()</code>,
    <code>Function()</code>, <code>document.createElement('script')</code>, and frame reference tricks
    (<code>window[0]</code>, <code>window.frames[0]</code>) are all intercepted on both runtimes. Salesforce
    actively closes these as they are discovered. The <code>loadScript</code> path pointing at an
    <strong>external URL</strong> still executes inside the LWS sandbox regardless of which runtime the site
    uses — Trusted Mode does not apply to external URLs, only to static resources.
  </div>

  <div class="callout warning">
    <strong>LWS Trusted Mode (Winter '26, GA) — a conditional path opens for LWC.</strong>
    Trusted Mode allows third-party scripts loaded via <code>loadScript</code> to bypass LWS and Locker
    entirely, giving unrestricted access to the real <code>window</code>, <code>document</code>, and DOM
    globals. This directly fixes the <code>postMessage</code> problem — <code>window.addEventListener('message', handler)</code>
    registers on the real browser window, so widget bidirectional communication works correctly.
    <br><br>
    <strong>However, Trusted Mode only applies to static resources — not external script URLs.</strong>
    The widget bundle must be uploaded to Salesforce as a Static Resource and whitelisted by an admin in
    Session Settings. Static Resources have a hard 5MB per-file size limit. If your widget bundle exceeds
    5MB it cannot be uploaded, and Trusted Mode does not apply.
    <br><br>
    <strong>Viability matrix for LWC in Spring '26:</strong><br>
    <span style="color:var(--green)">✓ Viable</span> — Bundle ≤ 5MB + LWR site + Trusted Mode enabled by admin + script whitelisted as static resource<br>
    <span style="color:var(--red)">✗ Not viable</span> — Bundle &gt; 5MB, or loading via external URL, or Aura site without careful LWS testing<br>
    <span style="color:var(--yellow)">⚠ Caveat</span> — Official Salesforce docs still state Experience Builder sites don't fully support
    third-party components when LWS is enabled. Test thoroughly in a sandbox before production.
  </div>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 03 — VISUALFORCE                                                         -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">03 — Option A</div>
  <div class="section-title">Visualforce Page as Full-Screen Transparent Overlay</div>
  <p class="section-desc">
    A Visualforce page runs in the classic Salesforce rendering pipeline — an entirely separate browsing context
    that LWS never touches. Embedded as a transparent, <code>pointer-events: none</code> iframe covering the
    full Experience Cloud page, it provides a true fixed overlay without interfering with the underlying
    page content.
  </p>

  <div class="two-col">
    <div class="pros-cons pros">
      <h4>Advantages</h4>
      <ul>
        <li>Runs completely outside LWS — real <code>window</code>, real <code>postMessage</code></li>
        <li><code>position: fixed</code> works natively inside the iframe</li>
        <li>Apex controller renders the access token as a merge field — synchronous, no async step</li>
        <li>Supports guest (unauthenticated) users</li>
        <li>Lowest setup complexity — no Connected App required</li>
        <li>Stable, well-understood Salesforce pattern</li>
        <li>Full control over page HTML, JS, and CSS</li>
      </ul>
    </div>
    <div class="pros-cons cons">
      <h4>Constraints</h4>
      <ul>
        <li>Requires a Trusted URL entry for the widget's origin domain (Setup → Trusted URLs)</li>
        <li>Token is server-rendered — short-lived tokens require JS Remoting for refresh without a page reload</li>
        <li>VF is mature but no longer receiving new platform investment</li>
        <li><code>pointer-events: none</code> on the iframe must be managed carefully for click-through</li>
        <li><strong>LWR sites only:</strong> the native VF Page component does not exist in Experience Builder — requires a custom LWC wrapper iframe or Head Markup injection</li>
      </ul>
    </div>
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge badge-vf">Apex Controller</span>
      <h3>Server-side token generation — token baked into the page before delivery</h3>
    </div>
    <div class="detail-card-body">
<pre class="code-block"><span class="cmt">// WidgetController.cls</span>
<span class="kw">public class</span> <span class="fn">WidgetController</span> {

    <span class="cmt">// Called by the VF merge field {!accessToken}</span>
    <span class="kw">public</span> String <span class="fn">getAccessToken</span>() {
        <span class="cmt">// UserInfo.getUserId() returns the logged-in community user</span>
        <span class="kw">return</span> <span class="fn">WidgetTokenService</span>.<span class="fn">generateToken</span>(UserInfo.<span class="fn">getUserId</span>());
    }

}</pre>

<pre class="code-block"><span class="cmt">&lt;!-- WidgetOverlay.page --&gt;</span>
&lt;<span class="tag">apex:page</span> <span class="attr">controller</span>=<span class="str">"WidgetController"</span>
           <span class="attr">showHeader</span>=<span class="str">"false"</span>
           <span class="attr">sidebar</span>=<span class="str">"false"</span>
           <span class="attr">standardStylesheets</span>=<span class="str">"false"</span>&gt;

    <span class="cmt">&lt;!-- Load the external widget bundle from your server --&gt;</span>
    &lt;<span class="tag">script</span> <span class="attr">src</span>=<span class="str">"https://widget.yourserver.com/widget/index.js"</span>&gt;&lt;/<span class="tag">script</span>&gt;

    &lt;<span class="tag">script</span>&gt;
        <span class="cmt">// {!accessToken} is rendered server-side before the page is sent to the browser.</span>
        <span class="cmt">// No async fetch, no race condition.</span>
        window.<span class="fn">mountWidget</span>({
            server:      <span class="str">"https://widget.yourserver.com"</span>,
            accessToken: <span class="str">"{!accessToken}"</span>,
            theme:       <span class="str">"dark"</span>
        });
    &lt;/<span class="tag">script</span>&gt;

&lt;/<span class="tag">apex:page</span>&gt;</pre>
    </div>
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge badge-vf">Overlay CSS</span>
      <h3>Full-screen transparent iframe — page content remains fully interactive</h3>
    </div>
    <div class="detail-card-body">
<pre class="code-block"><span class="cmt">/*
 * Applied to the iframe element in Experience Builder,
 * or injected via Settings → Advanced → Head Markup.
 *
 * pointer-events: none lets clicks pass through to the EC page.
 * The widget's floating button sets pointer-events: auto on itself,
 * so it captures clicks while the rest of the overlay is transparent.
 */</span>
.<span class="fn">vf-widget-frame</span> {
    position:       fixed;
    top:            0;
    left:           0;
    width:          100vw;
    height:         100vh;
    border:         none;
    background:     transparent;
    pointer-events: none;   <span class="cmt">/* page content stays clickable */</span>
    z-index:        9999;
}</pre>
    </div>
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge badge-vf">JS Remoting</span>
      <h3>On-demand token refresh without a page reload</h3>
    </div>
    <div class="detail-card-body">
<pre class="code-block"><span class="cmt">// Use JavaScript Remoting when the access token has a short TTL
// and must be refreshed without reloading the full page.</span>
Visualforce.remoting.Manager.<span class="fn">invokeAction</span>(
    <span class="str">'WidgetController.getAccessToken'</span>,
    <span class="kw">function</span>(result, event) {
        <span class="kw">if</span> (event.status) {
            window.<span class="fn">mountWidget</span>({
                server:      <span class="str">"https://widget.yourserver.com"</span>,
                accessToken: result,
                theme:       <span class="str">"dark"</span>
            });
        }
    },
    { escape: <span class="kw">false</span> }
);</pre>
    </div>
  </div>

  <div class="callout success">
    <strong>Guest user support:</strong> Because authentication runs through Apex, this pattern works for
    unauthenticated Experience Cloud pages. For guest users, the Apex method can return a guest-scoped
    token, a public session token, or redirect to login — the choice is yours.
  </div>

  <div class="callout danger">
    <strong>LWR sites: the native Visualforce Page component does not exist in Experience Builder.</strong>
    LWR templates are exclusively LWC-based. The drag-and-drop "Visualforce Page" component available
    in Aura Experience Builder is not present on LWR sites. VF pages are accessible via the
    <code>vforcesite</code> URL path (e.g. <code>https://yoursite.com/vforcesite/WidgetPage</code>)
    but cannot be embedded as a layout component directly.
    <br><br>
    <strong>On LWR sites, consider one of these two approaches instead:</strong><br><br>
    <strong>Option 1 — Head Markup iframe:</strong> In Experience Builder → Settings → Advanced →
    Head Markup, inject <code>&lt;iframe src="https://yoursite.com/vforcesite/WidgetPage" ...&gt;</code>
    with the full-screen overlay CSS. The VF page loads via its <code>vforcesite</code> URL and runs
    outside LWS as expected. Straightforward, but the overlay is wired in settings rather than a
    managed component.<br><br>
    <strong>Option 2 — Custom LWC wrapper (suited to LWR):</strong> Build a thin LWC that
    renders an <code>&lt;iframe&gt;</code> pointing to the <code>vforcesite</code> URL. The LWC can
    be dragged into Experience Builder normally. The VF page inside the iframe runs in its own
    browsing context, completely outside LWS. This is the cleanest pattern for LWR sites.
  </div>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 04 — CANVAS                                                              -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">04 — Option B</div>
  <div class="section-title">Salesforce Canvas App</div>
  <p class="section-desc">
    Canvas is Salesforce's native mechanism for embedding an externally-hosted web application via a managed
    iframe. The defining feature is its <strong>Signed Request</strong> authentication flow — Salesforce
    delivers a cryptographically signed user context to your server on every page load, eliminating the need
    to write any Apex token-generation code.
  </p>

  <div class="two-col">
    <div class="pros-cons pros">
      <h4>Advantages</h4>
      <ul>
        <li>Signed Request — cleaner auth model than Apex merge fields</li>
        <li>User identity (ID, email, org ID) delivered to your server securely via HMAC-SHA256</li>
        <li>Your server generates the access token from verified user context</li>
        <li>Runs in a real iframe — completely outside LWS</li>
        <li><code>window.postMessage</code> via Canvas JS SDK works correctly</li>
        <li>No Apex code required for authentication</li>
      </ul>
    </div>
    <div class="pros-cons cons">
      <h4>Constraints</h4>
      <ul>
        <li>Requires an authenticated Salesforce session — no guest user support</li>
        <li><strong>Spring '26:</strong> new Connected App creation is disabled by default — Canvas now requires an <strong>External Client App (ECA)</strong>; existing Connected Apps continue to work</li>
        <li>Users must be pre-authorized via profile or permission set assignment</li>
        <li><code>position: fixed</code> overlay requires an additional workaround (see below)</li>
        <li>Canvas is stable but receives no active platform investment from Salesforce</li>
        <li>Your server must implement HMAC-SHA256 signature verification</li>
      </ul>
    </div>
  </div>

  <div class="callout danger">
    <strong>Spring '26: Canvas now requires an External Client App — new Connected Apps are disabled by default.</strong>
    As of Spring '26, Salesforce disabled new Connected App creation by default across all orgs.
    The official Canvas Developer Guide (Spring '26) states: <em>"We recommend using external client apps
    for all new Canvas integrations."</em> Canvas support was added to External Client Apps (ECAs) in Spring '26.
    <br><br>
    <strong>What this means in practice:</strong><br>
    ✓ Existing Connected Apps continue to work and are unaffected.<br>
    ✓ New Canvas integrations must use an External Client App (App Manager → New External Client App → Canvas plugin).<br>
    ✗ If you specifically need a new Connected App (e.g. for a feature not yet available in ECAs), you must contact Salesforce Support to re-enable creation — and Salesforce has stated this support will not continue indefinitely.<br>
    ✗ The article's recommendation to "create a Connected App" applies only to existing Connected App setups. For all new implementations, use an External Client App.
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge badge-canvas">Signed Request Flow</span>
      <h3>How Canvas delivers verified user identity to your server</h3>
    </div>
    <div class="detail-card-body">
      <div class="flow-steps">
        <div class="flow-step">
          <div class="step-num">1</div>
          <div class="step-content">
            <strong>User loads the Experience Cloud page</strong>
            <p>The Canvas component renders in the Experience Builder layout.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num">2</div>
          <div class="step-content">
            <strong>Salesforce POSTs a signed request to your Canvas App URL</strong>
            <p>Payload is HMAC-SHA256 signed with your app secret (Connected App consumer secret or External Client App credentials). Contains user ID, email, org ID, OAuth access token, and the community URL.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num">3</div>
          <div class="step-content">
            <strong>Your server verifies the signature</strong>
            <p>Base64-decode the payload, recompute the HMAC, compare. If valid, extract the user context.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num">4</div>
          <div class="step-content">
            <strong>Your server generates an access token for the verified user</strong>
            <p>You have cryptographically confirmed user identity at this point — sign and return the token.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num">5</div>
          <div class="step-content">
            <strong>Server renders the page that mounts the widget</strong>
            <p>The widget mount call is made inline with the token. No Apex, no async fetch, no race condition.</p>
          </div>
        </div>
      </div>

<pre class="code-block"><span class="cmt">// Server-side: verify the Salesforce signed request (Node.js)</span>
<span class="kw">const</span> crypto = require(<span class="str">'crypto'</span>);

<span class="kw">function</span> <span class="fn">verifyAndDecode</span>(signedRequest, consumerSecret) {
    <span class="kw">const</span> [encodedSig, encodedPayload] = signedRequest.<span class="fn">split</span>(<span class="str">'.'</span>);

    <span class="cmt">// Recompute HMAC and compare to the signature in the request</span>
    <span class="kw">const</span> expectedSig = crypto
        .<span class="fn">createHmac</span>(<span class="str">'sha256'</span>, consumerSecret)
        .<span class="fn">update</span>(encodedPayload)
        .<span class="fn">digest</span>(<span class="str">'base64'</span>);

    <span class="kw">if</span> (expectedSig !== encodedSig) {
        <span class="kw">throw new</span> Error(<span class="str">'Signature mismatch — request is not from Salesforce'</span>);
    }

    <span class="kw">return</span> JSON.<span class="fn">parse</span>(
        Buffer.<span class="fn">from</span>(encodedPayload, <span class="str">'base64'</span>).<span class="fn">toString</span>(<span class="str">'utf8'</span>)
    );
}

<span class="cmt">// Decoded payload shape:
// {
//   context: {
//     user:         { userId, userName, email },
//     organization: { organizationId }
//   },
//   client: {
//     oauthToken: "00Dxx...",
//     instanceId: "_:your_canvas_app"
//   }
// }</span></pre>
    </div>
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge badge-canvas">Overlay Workarounds</span>
      <h3>Canvas iframes are layout components — three paths to a floating button</h3>
    </div>
    <div class="detail-card-body">
      <p style="color:var(--text-dim); font-size:13px; margin-bottom:16px;">
        Canvas iframes are placed within the Experience Builder page layout grid. They cannot natively
        render a <code>position: fixed</code> element that visually escapes their own boundary.
      </p>
      <div class="flow-steps">
        <div class="flow-step">
          <div class="step-num" style="background:var(--yellow); color:#000;">A</div>
          <div class="step-content">
            <strong>Full-page Canvas iframe (simplest)</strong>
            <p>Size the Canvas component to fill the full page content area. The widget's
            <code>position: fixed</code> is relative to the iframe's own viewport — it appears to float
            over the page. Simple, but the Canvas component consumes the entire page layout slot.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num" style="background:var(--accent);">B</div>
          <div class="step-content">
            <strong>Canvas + postMessage to a coordinating LWC (best visual accuracy)</strong>
            <p>The Canvas JS SDK sends a postMessage to the Experience Cloud parent page. A thin LWC
            listens and renders the floating button natively in the EC DOM. The LWC only handles the
            toggle signal — the widget script never runs through LWS. This gives the most accurate
            visual behavior.</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-num" style="background:var(--text-muted);">C</div>
          <div class="step-content">
            <strong>Use Canvas for auth only; Visualforce handles the overlay (hybrid)</strong>
            <p>The Canvas Signed Request vends the access token to your server. That token is then
            passed to a separately-embedded VF overlay page that mounts the widget. Separates
            authentication (Canvas strength) from overlay rendering (VF strength), at the cost
            of additional moving parts.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 05 — HEAD MARKUP                                                         -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">05 — Option C (Supplemental)</div>
  <div class="section-title">Experience Cloud Head Markup Injection</div>
  <p class="section-desc">
    In Experience Builder → Settings → Advanced → Head Markup, you can inject a
    <code>&lt;script src&gt;</code> tag that loads into the page's actual <code>&lt;head&gt;</code>,
    outside LWS. This is the only native Experience Cloud mechanism that runs at the host page level
    and bypasses the component sandbox entirely.
  </p>

  <div class="callout warning">
    <strong>Access token delivery is the problem.</strong> The Head Markup script executes before any
    LWC has initialized, so <code>@wire</code> and Apex are not available synchronously. You must either
    (a) fetch the token asynchronously from an Apex REST endpoint before calling the widget mount
    function, or (b) rely on a separate LWC to fetch the token and call the mount function on the
    parent <code>window</code> — but that call crosses the LWS boundary. Neither path is as clean
    as the VF merge field approach.
  </div>

<pre class="code-block"><span class="cmt">&lt;!-- Injected via Experience Builder → Settings → Advanced → Head Markup --&gt;</span>

<span class="cmt">&lt;!-- Step 1: Load the widget bundle from your server --&gt;</span>
&lt;<span class="tag">script</span> <span class="attr">src</span>=<span class="str">"https://widget.yourserver.com/widget/index.js"</span> defer&gt;&lt;/<span class="tag">script</span>&gt;

<span class="cmt">&lt;!-- Step 2: Fetch token from an Apex REST endpoint, then mount.
     No Authorization header is needed — the browser automatically includes
     the Salesforce session cookie for same-origin requests in Experience Cloud. --&gt;</span>
&lt;<span class="tag">script</span>&gt;
    <span class="fn">fetch</span>(<span class="str">'/services/apexrest/WidgetToken'</span>)
    .<span class="fn">then</span>(<span class="kw">function</span>(response) { <span class="kw">return</span> response.<span class="fn">json</span>(); })
    .<span class="fn">then</span>(<span class="kw">function</span>(data) {
        window.<span class="fn">mountWidget</span>({
            server:      <span class="str">"https://widget.yourserver.com"</span>,
            accessToken: data.token,
            theme:       <span class="str">"dark"</span>
        });
    });
&lt;/<span class="tag">script</span>&gt;</pre>

  <p style="color:var(--text-dim); font-size:13px; margin-top:8px;">
    Head Markup works best as the <em>script loader</em> while VF or Canvas handles authentication.
    Using it as the primary mount point introduces async complexity and makes token refresh harder
    to manage reliably.
  </p>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 06 — FULL COMPARISON                                                     -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">06 — Comparison</div>
  <div class="section-title">Full Capability Matrix</div>

  <div class="data-grid" style="grid-template-columns: 1.7fr 1fr 1fr 1fr 1fr;">

    <div class="cell hdr">Factor</div>
    <div class="cell hdr center">LWC + loadScript</div>
    <div class="cell hdr center">VF Overlay</div>
    <div class="cell hdr center">Canvas</div>
    <div class="cell hdr center last-col">Head Markup</div>

    <div class="cell dim">Runs outside LWS</div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Only with Trusted Mode + static resource ≤5MB</span></div>
    <div class="cell center"><span class="yes">✓</span></div>
    <div class="cell center"><span class="yes">✓</span></div>
    <div class="cell center last-col"><span class="yes">✓</span></div>

    <div class="cell dim"><code>window.postMessage</code> works correctly</div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Works with Trusted Mode; broken without it</span></div>
    <div class="cell center"><span class="yes">✓</span></div>
    <div class="cell center"><span class="yes">✓</span></div>
    <div class="cell center last-col"><span class="yes">✓</span></div>

    <div class="cell dim">Floating button overlay — native</div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Possible with Trusted Mode; requires careful CSS</span></div>
    <div class="cell center"><span class="yes">✓</span><span class="note-small">Transparent iframe</span></div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Needs workaround</span></div>
    <div class="cell center last-col"><span class="yes">✓</span><span class="note-small">Host page level</span></div>

    <div class="cell dim">Access token on mount</div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">@wire works; token passable if Trusted Mode enables real window access</span></div>
    <div class="cell center"><span class="yes">✓</span><span class="note-small">Apex merge field</span></div>
    <div class="cell center"><span class="yes">✓✓</span><span class="note-small">Signed Request (cleaner)</span></div>
    <div class="cell center last-col"><span class="partial">⚠ </span><span class="note-small">Async REST fetch</span></div>

    <div class="cell dim">Guest / unauthenticated user support</div>
    <div class="cell center"><span class="partial">⚠ </span></div>
    <div class="cell center"><span class="yes">✓</span></div>
    <div class="cell center"><span class="no">✗</span><span class="note-small">Active session required</span></div>
    <div class="cell center last-col"><span class="partial">⚠ </span></div>

    <div class="cell dim">Widget bundle size constraint</div>
    <div class="cell center"><span class="no">✗ Hard limit</span><span class="note-small">Static resource cap: 5MB. Trusted Mode unusable if bundle exceeds this</span></div>
    <div class="cell center"><span class="yes">✓ None</span><span class="note-small">Script loaded from external URL</span></div>
    <div class="cell center"><span class="yes">✓ None</span><span class="note-small">Script loaded from external URL</span></div>
    <div class="cell center last-col"><span class="yes">✓ None</span><span class="note-small">Script loaded from external URL</span></div>

    <div class="cell dim">LWS Trusted Mode required</div>
    <div class="cell center"><span class="yes">Yes</span><span class="note-small">Admin-enabled in Session Settings; static resource whitelisted</span></div>
    <div class="cell center"><span class="yes">No</span></div>
    <div class="cell center"><span class="yes">No</span></div>
    <div class="cell center last-col"><span class="yes">No</span></div>

    <div class="cell dim">Setup complexity</div>
    <div class="cell center"><span class="partial">Medium–High</span><span class="note-small">Trusted Mode config + static resource + admin approval</span></div>
    <div class="cell center"><span class="yes">Low</span></div>
    <div class="cell center"><span class="no">High</span><span class="note-small">External Client App + sig verify (Spring '26: Connected App creation disabled by default)</span></div>
    <div class="cell center last-col"><span class="partial">Medium</span></div>

    <div class="cell dim">Apex required</div>
    <div class="cell center">No</div>
    <div class="cell center"><span class="yes">Yes (simple)</span></div>
    <div class="cell center">No</div>
    <div class="cell center last-col">Optional</div>

    <div class="cell dim">External Trusted URL entry required</div>
    <div class="cell center"><span class="yes">Yes</span></div>
    <div class="cell center"><span class="yes">Yes</span></div>
    <div class="cell center"><span class="yes">Yes</span></div>
    <div class="cell center last-col"><span class="yes">Yes</span></div>

    <div class="cell dim">Token refresh without page reload</div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Possible via @wire re-invocation</span></div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">JS Remoting needed</span></div>
    <div class="cell center"><span class="partial">⚠ </span><span class="note-small">Canvas SDK re-request</span></div>
    <div class="cell center last-col"><span class="yes">✓</span><span class="note-small">Re-fetch REST endpoint</span></div>

    <div class="cell dim last-row">Salesforce long-term investment</div>
    <div class="cell center last-row"><span class="yes">High</span><span class="note-small">LWC + Trusted Mode is the emerging supported path</span></div>
    <div class="cell center last-row"><span class="partial">Stable</span><span class="note-small">Mature, not evolving</span></div>
    <div class="cell center last-row"><span class="partial">Stable</span><span class="note-small">Mature, not evolving</span></div>
    <div class="cell center last-col last-row"><span class="partial">Stable</span></div>

  </div>
</div>


<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 07 — ARCHITECTURE GUIDANCE                                               -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">07 — Architecture Guidance</div>
  <div class="section-title">Integration Approach</div>

  <div class="decision-tree">
    <div class="dt-row">
      <div class="dt-condition">
        <strong>Always-authenticated users</strong> + willing to configure an External Client App +
        want the cleanest authentication model with no Apex
      </div>
      <div class="dt-arrow">→</div>
      <div class="dt-result canvas">Canvas (Workaround B — coordinating LWC for toggle)</div>
    </div>
    <div class="dt-row">
      <div class="dt-condition">
        <strong>Any guest users</strong> OR want the simplest path to a working overlay OR
        prefer to keep authentication inside Apex
      </div>
      <div class="dt-arrow">→</div>
      <div class="dt-result vf">Visualforce Full-Screen Overlay</div>
    </div>
    <div class="dt-row">
      <div class="dt-condition">
        <strong>Want the best of both</strong> — Canvas's clean auth model plus VF's native
        overlay — and willing to manage two components
      </div>
      <div class="dt-arrow">→</div>
      <div class="dt-result hybrid">Canvas auth + VF overlay (hybrid)</div>
    </div>
    <div class="dt-row">
      <div class="dt-condition">
        <strong>Widget bundle ≤ 5MB</strong> + LWR site + willing to enable Trusted Mode + want
        a pure LWC solution on the Salesforce-native platform path
      </div>
      <div class="dt-arrow">→</div>
      <div class="dt-result" style="color:var(--purple);">LWC + Trusted Mode (prototype in sandbox first)</div>
    </div>
  </div>

  <div class="recommendation">
    <div class="rec-header">
      <span class="rec-badge">Primary Approach</span>
      <h3>Visualforce Overlay — Primary &nbsp;·&nbsp; Canvas if authentication elegance matters &nbsp;·&nbsp; LWC if bundle fits</h3>
    </div>

    <div class="option-cards">
      <div class="option-card primary">
        <span class="oc-badge oc-primary">Primary Approach</span>
        <h4>Visualforce Full-Screen Overlay</h4>
        <ul>
          <li>Create a VF page with an Apex controller that generates the access token</li>
          <li>Render the token as <code>{!accessToken}</code> — synchronous, no async step needed</li>
          <li>Load the external widget script directly in the VF page head</li>
          <li>Call the widget mount function inline — no race conditions</li>
          <li>Style the iframe: <code>position:fixed</code>, <code>100vw/vh</code>, <code>pointer-events:none</code>, transparent background</li>
          <li>Add the widget's origin to Trusted URLs with <code>script-src</code>, <code>connect-src</code>, and <code>frame-src</code></li>
          <li>Works for both guest and authenticated users</li>
        </ul>
      </div>
      <div class="option-card">
        <span class="oc-badge oc-alt">Alternative</span>
        <h4>Canvas + Coordinating LWC</h4>
        <ul>
          <li><strong>Spring '26:</strong> use an External Client App with Canvas plugin (not a Connected App — new Connected App creation requires a Salesforce Support request)</li>
          <li>Implement HMAC-SHA256 signature verification on your server</li>
          <li>Generate the access token server-side from the verified user context</li>
          <li>Canvas iframe hosts the widget — fully outside LWS</li>
          <li>Thin LWC on the EC page renders the floating button and handles toggle events only</li>
          <li>Canvas JS SDK sends postMessage for open/close signalling</li>
          <li>Authenticated users only — no guest support</li>
        </ul>
      </div>
    </div>

    <div class="option-card" style="margin-top:16px; border-color: var(--purple);">
      <span class="oc-badge" style="background:rgba(167,139,250,0.15); color:var(--purple); border:1px solid rgba(167,139,250,0.3);">Spring '26 — Conditional</span>
      <h4 style="color:var(--text); margin-top:8px;">LWC + LWS Trusted Mode</h4>
      <ul>
        <li><strong>Prerequisite:</strong> widget bundle must be ≤ 5MB and uploadable as a Static Resource</li>
        <li>Admin enables Trusted Mode in Setup → Session Settings</li>
        <li>Admin whitelists the Static Resource containing the widget bundle</li>
        <li>Developer passes <code>trustedMode</code> and <code>trustedGlobals</code> as the third argument to <code>loadScript</code></li>
        <li>Script now runs with unrestricted <code>window</code>, <code>document</code>, and DOM access — postMessage works</li>
        <li>LWR site strongly preferred; test on Aura separately</li>
        <li>No VF page, no Canvas Connected App, no iframe overlay needed</li>
        <li><strong>Caveat:</strong> not yet fully endorsed by Salesforce for Experience Builder + third-party widgets — validate in sandbox before production</li>
      </ul>
    </div>

    <p style="margin-top:16px; color:var(--text-dim); font-size:15px;">
      The VF approach remains the most straightforward and universally compatible path. Canvas is the
      cleanest for authentication when guest users aren't needed. LWC + Trusted Mode is the most
      platform-native option and the likely long-term direction Salesforce is heading — but it is
      conditional on bundle size and carries a sandbox-first requirement given its newness.
    </p>
  </div>

  <div class="callout info">
    <strong>Trusted URLs — required regardless of approach.</strong> The legacy "CSP Trusted Sites"
    setting was renamed to <strong>Trusted URLs</strong> in Summer '24 (API v58+) and now covers both
    CSP directives and Permissions-Policy directives. Navigate to Setup → <strong>Trusted URLs</strong>
    and add your widget server's origin with the following directives enabled:
    <code>script-src</code> (load the widget bundle), <code>connect-src</code> (WebSocket and API calls),
    and <code>frame-src</code> (embed the iframe). Set the CSP Context to <strong>All</strong>.
    On LWR sites, the site-level Experience Builder setting controls LWS independently of the org-level
    Session Settings toggle — verify it is correctly configured for your site after any upgrade.
  </div>
</div>

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- 08 — 2026 SECURITY WARNING                                               -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-label">08 — 2026 Security Considerations</div>
  <div class="section-title">Third-Party Cookie Restrictions &amp; CSP Directive Selection</div>
  <p class="section-desc">
    Two security considerations are frequently underestimated during implementation and become
    production problems after launch. Both apply to every integration approach described in this document.
  </p>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge" style="background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.3);">Cookie Restriction</span>
      <h3>Third-Party Cookie Blocking — Chrome reversed, Safari and Firefox did not</h3>
    </div>
    <div class="detail-card-body">
      <p style="color:var(--text-dim); font-size:15px; margin-bottom:16px;">
        Google canceled its forced Chrome deprecation in April 2025 and deprecated all Privacy Sandbox
        replacement APIs in October 2025. Third-party cookies remain enabled by default in Chrome — but
        this is not the full picture.
      </p>

      <div class="data-grid" style="grid-template-columns: 1fr 1fr 1.4fr;">
        <div class="cell hdr">Browser</div>
        <div class="cell hdr center">Third-Party Cookies</div>
        <div class="cell hdr last-col">Impact on iframe widgets</div>

        <div class="cell dim">Chrome (default)</div>
        <div class="cell center"><span class="yes">Enabled</span><span class="note-small">Users can opt out in Privacy &amp; Security settings</span></div>
        <div class="cell last-col">Works, unless user has opted out. Must use <code>SameSite=None; Secure</code>.</div>

        <div class="cell dim">Chrome (Incognito)</div>
        <div class="cell center"><span class="no">Blocked</span><span class="note-small">IP Protection planned; stricter cookie controls</span></div>
        <div class="cell last-col">Widget session cookies inaccessible. Token-based auth unaffected.</div>

        <div class="cell dim">Safari (all versions)</div>
        <div class="cell center"><span class="no">Blocked</span><span class="note-small">Intelligent Tracking Prevention (ITP) since 2020</span></div>
        <div class="cell last-col">All cross-origin iframe cookies blocked. Storage Access API requires user gesture.</div>

        <div class="cell dim">Firefox (default)</div>
        <div class="cell center"><span class="partial">Partitioned</span><span class="note-small">Total Cookie Protection — isolated per top-level site, default for all users since v103 (July 2022)</span></div>
        <div class="cell last-col">Cookies are partitioned: same widget embedded on two different Salesforce pages gets separate cookie jars.</div>

        <div class="cell dim last-row">Firefox (Strict mode)</div>
        <div class="cell center last-row"><span class="no">Blocked</span></div>
        <div class="cell last-col last-row">Full block — same as Safari.</div>
      </div>

      <div class="callout warning" style="margin-top:16px;">
        <strong>Safari + Firefox represent roughly 30% of browser users in 2026.</strong> Any widget that
        relies on its own server-side session cookie being readable inside the Salesforce iframe will silently
        break for these users — no error, just an unauthenticated or blank widget state.
      </div>

      <p style="color:var(--text-dim); font-size:15px; margin-top:16px; margin-bottom:12px;"><strong style="color:var(--text);">Mitigation by integration approach:</strong></p>

      <div class="data-grid" style="grid-template-columns: 1fr 2fr;">
        <div class="cell hdr">Approach</div>
        <div class="cell hdr last-col">Cookie risk &amp; recommended mitigation</div>

        <div class="cell dim">VF Overlay / Canvas / Head Markup</div>
        <div class="cell last-col">
          JWT is passed as a JavaScript parameter to the widget mount call — never stored in a cookie for auth.
          This sidesteps the cookie problem for authentication entirely.
          <strong>Risk:</strong> if the widget server also sets a session cookie for conversation state or
          analytics, that cookie needs <code>SameSite=None; Secure; Partitioned</code> (CHIPS) to survive
          Safari and Firefox. Add the <code>Partitioned</code> attribute server-side on any cross-site cookies.
        </div>

        <div class="cell dim">LWC + Trusted Mode</div>
        <div class="cell last-col">
          Same as above — token is passed via <code>loadScript</code> parameters. If the widget makes
          subsequent authenticated requests using <code>fetch</code> with credentials, those requests
          must use token headers, not cookies, for Safari/Firefox compatibility.
        </div>

        <div class="cell dim last-row">Any approach — widget using <code>localStorage</code> or <code>sessionStorage</code></div>
        <div class="cell last-col last-row">
          Chrome partitioned storage in cross-site iframes since Fall 2023. Safari and Firefox also
          partition storage. State stored in <code>localStorage</code> inside the widget iframe is
          partitioned per Salesforce origin — acceptable for most widget state, but users on multiple
          Salesforce community URLs won't share state across those URLs.
        </div>
      </div>
    </div>
  </div>

  <div class="detail-card">
    <div class="detail-card-header">
      <span class="badge" style="background:rgba(59,130,246,0.15); color:var(--accent-bright); border:1px solid rgba(59,130,246,0.3);">CSP Directives</span>
      <h3>Trusted URLs — selecting the correct directives for each resource type</h3>
    </div>
    <div class="detail-card-body">
      <p style="color:var(--text-dim); font-size:15px; margin-bottom:16px;">
        In Setup → Trusted URLs, each directive unlocks a specific browser resource type. Enabling too few
        causes partial, hard-to-diagnose failures. Enabling more than necessary widens the attack surface.
        The correct set for a third-party widget integration is precisely these three:
      </p>

      <div class="data-grid" style="grid-template-columns: 0.7fr 1fr 1.4fr 0.9fr;">
        <div class="cell hdr">Directive</div>
        <div class="cell hdr">What it permits</div>
        <div class="cell hdr">Why it is needed</div>
        <div class="cell hdr last-col">Without it</div>

        <div class="cell dim"><code>script-src</code></div>
        <div class="cell">Loading JavaScript from the trusted origin</div>
        <div class="cell">Allows the widget bundle (<code>widget/index.js</code>) to be fetched and executed — whether via <code>&lt;script src&gt;</code> in a VF page, <code>loadScript</code> in LWC, or Head Markup injection</div>
        <div class="cell last-col">Browser blocks script load. Widget never initializes.</div>

        <div class="cell dim"><code>connect-src</code></div>
        <div class="cell">XHR, fetch, WebSocket, and EventSource connections to the trusted origin</div>
        <div class="cell">Allows the widget to open a WebSocket to its server for streaming responses, and to make API calls (token refresh, conversation history, etc.)</div>
        <div class="cell last-col">WebSocket connection refused. Chat appears to load but never receives messages.</div>

        <div class="cell dim"><code>frame-src</code></div>
        <div class="cell">Embedding an <code>&lt;iframe&gt;</code> whose <code>src</code> points to the trusted origin</div>
        <div class="cell">Allows the widget's chat panel (which renders inside an iframe on the widget server's origin) to load inside the Salesforce page</div>
        <div class="cell last-col">iframe blocked. Floating button appears but chat panel never opens.</div>

        <div class="cell dim last-row"><code>img-src</code> / <code>font-src</code> / <code>style-src</code></div>
        <div class="cell last-row">Images, web fonts, CSS from the trusted origin</div>
        <div class="cell last-row">Only needed if the widget loads these resources directly from its own origin rather than bundling them. Check your widget's network tab — add only what is actually requested.</div>
        <div class="cell last-col last-row">Resource blocked silently. Broken icons or missing fonts in the widget UI.</div>
      </div>

      <div class="callout info" style="margin-top:16px;">
        <strong>Set CSP Context to "All" for each entry.</strong> Scoping a directive to only
        "Lightning Experience" or "Visualforce" will block it in the Experience Cloud site context,
        which is distinct from both. Use <strong>All</strong> to cover Experience Cloud, Lightning
        Experience, and Visualforce simultaneously. After saving, use the browser's DevTools
        Network tab to confirm no CSP violations appear on page load.
      </div>

      <div class="callout warning">
        <strong>The <code>frame-ancestors</code> directive must be set on your server — it cannot
        be configured in Salesforce's Trusted URLs.</strong> <code>frame-ancestors</code> is an
        outbound header that your widget server sends to tell browsers which origins are allowed to
        embed it in an iframe. Trusted URLs only control inbound CSP for the Salesforce page.
        Both sides must be configured: Salesforce allows the iframe via <code>frame-src</code>,
        and your server permits being embedded via <code>frame-ancestors</code>.
      </div>
    </div>
  </div>

</div>

<div class="footnote">
  Technical Architecture Reference — Third-Party Widget / Salesforce Experience Cloud Integration ·
  Covers: LWC + LWS · LWS Trusted Mode · Visualforce · Salesforce Canvas · Head Markup · Cookie Restrictions · CSP Directives ·
  Platform: Experience Cloud · Spring '26 (v66.0) · LWR + Aura
</div>

</div>
`;
export default html;
