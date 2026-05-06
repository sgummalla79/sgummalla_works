const html = `
<div class="doc-header">
  <div class="label">Technical Architecture Reference</div>
  <h1>Obtaining User-Scoped Salesforce Tokens<br>Without a Password</h1>
  <div class="subtitle">JWT Bearer Grant · OAuth 2.0 Token Exchange — Server-to-Server Authentication Patterns</div>
  <div class="meta-row">
    <span class="meta-tag">Platform: Salesforce Platform</span>
    <span class="meta-tag">Standards: RFC 7523 · RFC 8693</span>
    <span class="meta-tag">Flows: JWT Bearer · Token Exchange</span>
    <span class="meta-tag">Release: Spring '26</span>
  </div>
</div>

<div class="container">

<!-- 00 — OVERVIEW -->
<div class="section">
  <div class="section-label">00 — Overview</div>
  <div class="section-title">Two Patterns for Passwordless Salesforce Authentication</div>
  <p class="section-desc">
    Server-side integrations often need to act on behalf of a specific Salesforce user — querying
    records, executing Apex, or calling APIs — without storing that user's password or requiring
    interactive login. Two OAuth 2.0 grant types address this precisely:
    the <strong>JWT Bearer Grant</strong> (RFC 7523) and the
    <strong>OAuth 2.0 Token Exchange</strong> (RFC 8693).
  </p>
  <p class="section-desc">
    Both patterns produce a Salesforce <code>access_token</code> scoped to a real named user,
    with that user's profile, permission sets, and record visibility — without any browser
    redirect or password prompt. All credential handling happens server-to-server.
  </p>

  <div class="data-grid" style="grid-template-columns: 1.4fr 1fr 1fr;">
    <div class="cell hdr">Dimension</div>
    <div class="cell hdr center">JWT Bearer (RFC 7523)</div>
    <div class="cell hdr center last-col">Token Exchange (RFC 8693)</div>

    <div class="cell dim">Credential held by server</div>
    <div class="cell center">RSA private key</div>
    <div class="cell center last-col">IdP-issued token (e.g. id_token)</div>

    <div class="cell dim">User identity source</div>
    <div class="cell center">Salesforce username passed at call time</div>
    <div class="cell center last-col">Identity claim inside IdP token</div>

    <div class="cell dim">Salesforce app type</div>
    <div class="cell center"><span class="yes">External Client App (required)</span></div>
    <div class="cell center last-col"><span class="yes">External Client App (required)</span></div>

    <div class="cell dim">Custom Apex required</div>
    <div class="cell center"><span class="no">No</span></div>
    <div class="cell center last-col"><span class="yes">Yes — token handler</span></div>

    <div class="cell dim">Best suited for</div>
    <div class="cell center">Service accounts, batch jobs, per-user API calls where the caller controls the Salesforce username</div>
    <div class="cell center last-col">Federating an existing IdP session into Salesforce without re-authenticating</div>

    <div class="cell dim last-row">Browser involvement</div>
    <div class="cell center last-row"><span class="no">None</span></div>
    <div class="cell center last-col last-row"><span class="yes">Optional</span><span class="note-small">Login phase only — once the IdP token is stored server-side, all Salesforce calls are server-to-server</span></div>
  </div>
</div>

<!-- 01 — JWT BEARER FLOW -->
<div class="section">
  <div class="section-label">01 — JWT Bearer Flow</div>
  <div class="section-title">RFC 7523 — How the Assertion-Based Grant Works</div>
  <p class="section-desc">
    The JWT Bearer grant lets a server prove its identity to Salesforce using a cryptographically
    signed assertion rather than a client secret or user password. Salesforce verifies the
    signature against a certificate you uploaded, then issues an <code>access_token</code>
    for the Salesforce user named in the assertion. The private key never leaves the server.
  </p>

  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:20px;">
    The server mints a short-lived JWT signed with its RSA private key. The JWT carries three
    critical claims: <code>iss</code> (Consumer Key of the External Client App),
    <code>sub</code> (the Salesforce username to impersonate), and
    <code>aud</code> (the Salesforce token endpoint). Salesforce verifies the RS256 signature
    against the certificate on the External Client App, checks that the user is pre-authorised,
    and returns an access token.
  </p>

  <!-- JWT Bearer sequence diagram -->
  <div class="ad-seq ad-seq--3" style="width:640px">
    <div class="ad-actors">
      <div class="ad-actor" style="--c:#3b82f6;--bg:#dbeafe;--tx:#1d4ed8">Client App</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#7c3aed;--bg:#ede9fe;--tx:#5b21b6">Server</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#0284c7;--bg:#e0f2fe;--tx:#075985">Salesforce</div>
    </div>
    <div class="ad-body">
      <div class="ad-lifelines">
        <div class="ad-ll" style="--c:#3b82f6;grid-column:2"></div>
        <div class="ad-ll" style="--c:#7c3aed;grid-column:5"></div>
        <div class="ad-ll" style="--c:#0284c7;grid-column:8"></div>
      </div>
      <div class="ad-steps">

        <!-- 1: Client → Server -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:2/5;grid-row:1">1. POST /api/token  { sf_username }</div>
          <div class="ad-arrow-r" style="--ac:#3b82f6;grid-column:2/5;grid-row:2"></div>
        </div>

        <!-- 2: Server self — mint JWT -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#7c3aed;--nb:var(--surface2);grid-column:5/9;grid-row:1">
            <span class="ad-note-title">2. Mint RS256 JWT assertion</span>
            <span class="ad-note-sub">iss=ConsumerKey · sub=sfUsername · exp=now+3min</span>
          </div>
        </div>

        <!-- 3: Server → Salesforce -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:5/8;grid-row:1">3. POST /oauth2/token<br>(jwt-bearer grant)</div>
          <div class="ad-arrow-r" style="--ac:#7c3aed;grid-column:5/8;grid-row:2"></div>
        </div>

        <!-- 4: Salesforce self — validate -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#0284c7;--nb:var(--surface2);grid-column:7/9;grid-row:1">
            <span class="ad-note-title">4. Verify signature &amp; certificate</span>
            <span class="ad-note-sub">Check pre-authorisation · Issue session</span>
          </div>
        </div>

        <!-- 5: Salesforce → Server -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:5/8;grid-row:1">5. { access_token, instance_url }</div>
          <div class="ad-arrow-l" style="--ac:#0284c7;grid-column:5/8;grid-row:2"></div>
        </div>

        <!-- 6: Server self — save -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#7c3aed;--nb:var(--surface2);grid-column:5/9;grid-row:1">
            <span class="ad-note-title">6. Cache token server-side</span>
          </div>
        </div>

        <!-- 7: Server → Client -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:2/5;grid-row:1">7. { access_token, instance_url,<br>sf_username }</div>
          <div class="ad-arrow-l" style="--ac:#7c3aed;grid-column:2/5;grid-row:2"></div>
        </div>

      </div>
    </div>
    <div class="ad-legend">
      <span class="ad-dot" style="--c:#3b82f6;background:#3b82f6"></span>Client App
      <span class="ad-dot" style="--c:#7c3aed;background:#7c3aed"></span>Server
      <span class="ad-dot" style="--c:#0284c7;background:#0284c7"></span>Salesforce
      <div class="ad-legend-note">RSA private key never leaves the server · all Salesforce calls are server-to-server</div>
    </div>
  </div>

  <div class="callout info">
    <strong>Short JWT lifetime is intentional.</strong> The assertion is valid for 3 minutes
    (Salesforce maximum). The resulting <code>access_token</code> carries a standard session
    lifetime. Each token acquisition mints a fresh JWT — do not reuse assertions.
  </div>
</div>

<!-- 02 — JWT BEARER SETUP -->
<div class="section">
  <div class="section-label">02 — JWT Bearer Setup</div>
  <div class="section-title">Salesforce Configuration — External Client App, Certificate &amp; OAuth Policies</div>
  <p class="section-desc">
    This flow requires a Salesforce External Client App with a digital certificate uploaded,
    the JWT Bearer OAuth policy enabled, and target users pre-authorised before the first
    token request.
  </p>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 1 — Generate an RSA Key Pair</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:16px;">
    Generate a 2048-bit (or 4096-bit) RSA key pair. The private key stays on your server;
    the public certificate is uploaded to Salesforce.
  </p>

<pre class="lws-diagram">
# Generate private key
openssl genrsa -out private.pem 2048

# Generate self-signed certificate (10-year validity)
openssl req -new -x509 -key private.pem \
  -out certificate.crt -days 3650 \
  -subj "/CN=your-app-name"
</pre>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 2 — Create the External Client App</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:12px;">
    In Salesforce Setup → External Client Apps → New:
  </p>

  <div class="data-grid" style="grid-template-columns: 1fr 2fr;">
    <div class="cell hdr">Field</div>
    <div class="cell hdr last-col">Value</div>

    <div class="cell dim">Enable OAuth Settings</div>
    <div class="cell last-col"><span class="yes">✓ Checked</span></div>

    <div class="cell dim">Callback URL</div>
    <div class="cell last-col"><code>https://login.salesforce.com/services/oauth2/success</code> (placeholder — not used by this flow)</div>

    <div class="cell dim">Selected OAuth Scopes</div>
    <div class="cell last-col"><code>api</code>, <code>refresh_token</code> (add scopes your integration needs)</div>

    <div class="cell dim">Use Digital Signatures</div>
    <div class="cell last-col"><span class="yes">✓ Checked</span> — upload <code>certificate.crt</code></div>

    <div class="cell dim last-row">Permitted Users</div>
    <div class="cell last-col last-row">
      <strong>Admin approved users are pre-authorized</strong> — grants access to specific profiles or permission sets only.
      Alternatively <em>All users may self-authorize</em> for development environments.
    </div>
  </div>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 3 — Enable Pre-Authorisation</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:12px;">
    After saving the External Client App, open its OAuth settings and configure policies:
  </p>
  <ul style="font-size:15px;color:var(--text-dim);line-height:2;padding-left:1.5rem;margin-bottom:20px;">
    <li>Set <strong>Permitted Users</strong> to <em>Admin approved users are pre-authorized</em></li>
    <li>Add the profiles or permission sets that should be eligible under the pre-authorization section</li>
    <li>Note the <strong>Consumer Key</strong> — this becomes the <code>iss</code> claim in your JWT</li>
  </ul>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 4 — Mint and Exchange the JWT (Server Code)</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:16px;">
    At token-request time, the server constructs and signs the JWT, then POSTs it to Salesforce:
  </p>

<pre class="lws-diagram">
// JWT payload
{
  "iss": "&lt;Consumer Key&gt;",
  "sub": "&lt;salesforce.username@example.com&gt;",
  "aud": "https://login.salesforce.com",
  "exp": &lt;unix timestamp: now + 180 seconds&gt;
}

// Signed with RS256 using the RSA private key

// Token endpoint
POST https://login.salesforce.com/services/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&amp;assertion=&lt;signed JWT&gt;
</pre>

  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-top:16px;">
    A successful response returns <code>access_token</code>, <code>instance_url</code>,
    and optionally <code>refresh_token</code> (if the External Client App has refresh token scope enabled).
    Use <code>instance_url</code> as the base URL for all subsequent Salesforce API calls.
  </p>

  <div class="callout warning">
    <strong>Sandbox vs Production.</strong> Use <code>https://test.salesforce.com</code> as the
    <code>aud</code> claim and token endpoint when targeting a sandbox org.
    The External Client App must exist in the org you are authenticating against.
  </div>

  <div class="callout success">
    <strong>No user interaction required.</strong> Once a Salesforce user is pre-authorised on the
    External Client App, any server holding the private key can obtain a token for that user at any time.
    This makes the JWT Bearer flow well-suited to background jobs, ETL pipelines, and multi-tenant
    integrations where each tenant maps to a named Salesforce user.
  </div>
</div>

<!-- 03 — TOKEN EXCHANGE FLOW -->
<div class="section">
  <div class="section-label">03 — OAuth 2.0 Token Exchange</div>
  <div class="section-title">RFC 8693 — How the Token Exchange Grant Works in Salesforce</div>
  <p class="section-desc">
    The OAuth 2.0 Token Exchange grant allows a server to present a token issued by a trusted
    Identity Provider (IdP) and receive a Salesforce <code>access_token</code> in return —
    without the user re-authenticating. Salesforce delegates identity resolution to a custom
    Apex handler that decodes the incoming token, maps it to a Salesforce user, and returns
    that user for session issuance.
  </p>

  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:20px;">
    The flow operates in two phases. In Phase 1, the user logs in through your Identity Provider
    and receives an <code>id_token</code> (or any signed token carrying user identity claims).
    That token is stored server-side at session time. In Phase 2, when a Salesforce token is
    needed, the server forwards the stored IdP token to Salesforce's token endpoint using the
    <code>urn:ietf:params:oauth:grant-type:token-exchange</code> grant. Salesforce invokes the
    registered Apex handler, which decodes the IdP token and resolves the Salesforce username.
    No new JWT is minted — the IdP token is forwarded as-is.
  </p>

  <!-- Token Exchange sequence diagram -->
  <div class="ad-seq ad-seq--5" style="width:860px">
    <div class="ad-actors">
      <div class="ad-actor" style="--c:#3b82f6;--bg:#dbeafe;--tx:#1d4ed8">Browser</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#d97706;--bg:#fef3c7;--tx:#78350f">Identity Provider</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#7c3aed;--bg:#ede9fe;--tx:#5b21b6">Server</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#0284c7;--bg:#e0f2fe;--tx:#075985">Salesforce</div>
      <div class="ad-gap"></div>
      <div class="ad-actor" style="--c:#16a34a;--bg:#dcfce7;--tx:#14532d">Apex Handler</div>
    </div>
    <div class="ad-body">
      <div class="ad-lifelines">
        <div class="ad-ll" style="--c:#3b82f6;grid-column:2"></div>
        <div class="ad-ll" style="--c:#d97706;grid-column:5"></div>
        <div class="ad-ll" style="--c:#7c3aed;grid-column:8"></div>
        <div class="ad-ll" style="--c:#0284c7;grid-column:11"></div>
        <div class="ad-ll" style="--c:#16a34a;grid-column:14"></div>
      </div>
      <div class="ad-steps">

        <!-- Phase 1 -->
        <div class="ad-phase-row">
          <div class="ad-phase" style="--pc:#d97706;--pb:#1c1400;grid-column:1/7">PHASE 1 — USER LOGIN</div>
        </div>

        <!-- 1: Browser → IdP -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:2/5;grid-row:1">1. OAuth2 Login</div>
          <div class="ad-arrow-r" style="--ac:#3b82f6;grid-column:2/5;grid-row:2"></div>
        </div>

        <!-- 2: IdP → Server -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:5/8;grid-row:1">2. id_token<br>(with identity claims)</div>
          <div class="ad-arrow-r" style="--ac:#d97706;grid-column:5/8;grid-row:2"></div>
        </div>

        <!-- 3: Server self — save -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#7c3aed;--nb:var(--surface2);grid-column:8/12;grid-row:1">
            <span class="ad-note-title">3. Store id_token server-side</span>
          </div>
        </div>

        <!-- Phase 2 -->
        <div class="ad-phase-row">
          <div class="ad-phase" style="--pc:#0284c7;--pb:#061f2c;grid-column:1/15">PHASE 2 — TOKEN EXCHANGE</div>
        </div>

        <!-- 4: Browser → Server -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:2/8;grid-row:1">4. POST /api/token  (session cookie — no credentials)</div>
          <div class="ad-arrow-r" style="--ac:#3b82f6;grid-column:2/8;grid-row:2"></div>
        </div>

        <!-- 5: Server self — retrieve -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#7c3aed;--nb:var(--surface2);grid-column:8/12;grid-row:1">
            <span class="ad-note-title">5. Retrieve stored id_token</span>
          </div>
        </div>

        <!-- 6: Server → Salesforce -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:8/11;grid-row:1">6. POST /oauth2/token<br>(token-exchange grant)</div>
          <div class="ad-arrow-r" style="--ac:#7c3aed;grid-column:8/11;grid-row:2"></div>
        </div>

        <!-- 7: Salesforce → Apex -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:11/14;grid-row:1">7. validateIncomingToken(<br>id_token, appDeveloperName)</div>
          <div class="ad-arrow-r" style="--ac:#0284c7;grid-column:11/14;grid-row:2"></div>
        </div>

        <!-- 8: Apex self — decode -->
        <div class="ad-step n">
          <div class="ad-note" style="--nc:#16a34a;--nb:var(--surface2);grid-column:12/15;grid-row:1">
            <span class="ad-note-title">8. Decode JWT payload</span>
            <span class="ad-note-sub">Read identity claim → resolve Salesforce username</span>
          </div>
        </div>

        <!-- 9: Apex → Salesforce -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:11/14;grid-row:1">9. getUserForTokenSubject(<br>sf_username)</div>
          <div class="ad-arrow-l" style="--ac:#16a34a;grid-column:11/14;grid-row:2"></div>
        </div>

        <!-- 10: Salesforce → Server -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:8/11;grid-row:1">10. { access_token,<br>instance_url }</div>
          <div class="ad-arrow-l" style="--ac:#0284c7;grid-column:8/11;grid-row:2"></div>
        </div>

        <!-- 11: Server → Browser -->
        <div class="ad-step">
          <div class="ad-label" style="grid-column:2/8;grid-row:1">11. { access_token, instance_url, sf_username }</div>
          <div class="ad-arrow-l" style="--ac:#7c3aed;grid-column:2/8;grid-row:2"></div>
        </div>

      </div>
    </div>
    <div class="ad-legend">
      <span class="ad-dot" style="background:#3b82f6"></span>Browser
      <span class="ad-dot" style="background:#d97706"></span>Identity Provider
      <span class="ad-dot" style="background:#7c3aed"></span>Server
      <span class="ad-dot" style="background:#0284c7"></span>Salesforce
      <span class="ad-dot" style="background:#16a34a"></span>Apex Handler
      <div class="ad-legend-note">IdP token forwarded as-is — no new JWT minted · Apex handler owns identity resolution · all Salesforce calls are server-to-server</div>
    </div>
  </div>

  <div class="callout info">
    <strong>The IdP token is forwarded as-is.</strong> The server does not sign a new JWT or
    transform the token in any way. Salesforce passes the raw token to your Apex handler, which
    performs all decoding and user resolution. This keeps identity logic centralised in Apex
    and ensures the token's integrity (signature) can be verified if needed.
  </div>
</div>

<!-- 04 — TOKEN EXCHANGE SETUP -->
<div class="section">
  <div class="section-label">04 — Token Exchange Setup</div>
  <div class="section-title">Salesforce Configuration — External Client App, Apex Handler &amp; Metadata</div>
  <p class="section-desc">
    The Token Exchange flow requires a Salesforce External Client App, a custom
    Apex class extending <code>Auth.Oauth2TokenExchangeHandler</code>, and a metadata record
    linking the two. This flow cannot use the legacy Connected App type.
  </p>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 1 — Create an External Client App</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:12px;">
    In Salesforce Setup → External Client Apps → New:
  </p>

  <div class="data-grid" style="grid-template-columns: 1fr 2fr;">
    <div class="cell hdr">Field</div>
    <div class="cell hdr last-col">Value</div>

    <div class="cell dim">App Name &amp; Developer Name</div>
    <div class="cell last-col">Choose a name matching your integration (e.g. <code>my_token_exchange_app</code>)</div>

    <div class="cell dim">Distribution State</div>
    <div class="cell last-col">Local (single-org) or Global (managed package)</div>

    <div class="cell dim">Selected OAuth Scopes</div>
    <div class="cell last-col"><code>api</code>, <code>refresh_token</code> as needed</div>

    <div class="cell dim last-row">Token Exchange Grant</div>
    <div class="cell last-col last-row"><span class="yes">✓ Enable</span> — exposes the <code>token-exchange</code> grant type</div>
  </div>

  <div class="callout warning">
    <strong>External Client Apps use a different metadata type.</strong>
    The <code>ExternalClientApplication</code> metadata type replaces <code>ConnectedApp</code>
    for this flow. Deployments via Salesforce CLI use <code>.eca-meta.xml</code> files.
    Verify your SFDX project targets API version 63.0 or later.
  </div>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 2 — Implement the Apex Token Handler</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:16px;">
    Create an Apex class extending <code>Auth.Oauth2TokenExchangeHandler</code>. Two methods
    are required:
  </p>
  <ul style="font-size:15px;color:var(--text-dim);line-height:2;padding-left:1.5rem;margin-bottom:16px;">
    <li><code>validateIncomingToken()</code> — decode the token, extract identity claims, return a
        <code>Auth.TokenValidationResult</code> containing the resolved Salesforce username</li>
    <li><code>getUserForTokenSubject()</code> — given the username, query and return the
        <code>User</code> record; Salesforce uses this to issue the session</li>
  </ul>

<pre class="lws-diagram">
public class MyTokenExchangeHandler extends Auth.Oauth2TokenExchangeHandler {

    public override Auth.TokenValidationResult validateIncomingToken(
        String appDeveloperName,
        Auth.IntegratingAppType appType,
        String incomingToken,
        Auth.OAuth2TokenExchangeType tokenType
    ) {
        // Decode the base64url JWT payload (no library needed)
        String[] parts = incomingToken.split('\\.');
        String payload = parts[1].replace('-', '+').replace('_', '/');
        while (Math.mod(payload.length(), 4) != 0) payload += '=';
        Map&lt;String,Object&gt; claims = (Map&lt;String,Object&gt;)
            JSON.deserializeUntyped(
                EncodingUtil.base64Decode(payload).toString()
            );

        // Extract the claim that maps to the Salesforce username
        String sfUsername = (String) claims.get('salesforce_username');

        if (String.isBlank(sfUsername)) {
            return Auth.TokenValidationResult.failure('Identity claim missing');
        }
        return Auth.TokenValidationResult.success(sfUsername);
    }

    public override User getUserForTokenSubject(
        String tokenSubject,
        String appDeveloperName,
        Auth.IntegratingAppType appType
    ) {
        List&lt;User&gt; users = [
            SELECT Id, Username
            FROM   User
            WHERE  Username = :tokenSubject
               AND IsActive  = true
            LIMIT 1
        ];
        return users.isEmpty() ? null : users[0];
    }
}
</pre>

  <div class="callout info">
    <strong>Identity claim mapping.</strong> The claim used to resolve the Salesforce username
    depends entirely on what your IdP includes in the token. Common patterns include a
    <code>salesforce_username</code> custom claim, a <code>federation_id</code> mapped to
    the Salesforce <code>FederationIdentifier</code> field, or matching against
    <code>User.Email</code>. Username matching is the most reliable since it is unique per org.
    Consider using <code>appDeveloperName</code> to restrict which apps can exchange tokens
    for which users.
  </div>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 3 — Register the Handler Metadata</h3>
  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-bottom:16px;">
    Salesforce requires an <code>OauthTokenExchangeHandler</code> metadata record linking the
    Apex class to the External Client App. Create this link via Apex DML in an anonymous window:
  </p>

<pre class="lws-diagram">
// Find the External Client App
ExternalClientApplication eca = [
    SELECT Id FROM ExternalClientApplication
    WHERE DeveloperName = 'my_token_exchange_app'
    LIMIT 1
];

// Create the handler record
OauthTokenExchangeHandler handler = new OauthTokenExchangeHandler();
handler.ApexClass__c  = 'MyTokenExchangeHandler';
handler.DeveloperName = 'MyTokenExchangeHandler';
handler.MasterLabel   = 'My Token Exchange Handler';
handler.IsEnabled__c  = true;
insert handler;

// Link handler → External Client App
OauthTokenExchHandlerApp link = new OauthTokenExchHandlerApp();
link.OauthTokenExchangeHandlerId = handler.Id;
link.ExternalClientApplicationId = eca.Id;
insert link;
</pre>

  <div class="callout warning">
    <strong>API field names vary by org version.</strong> The field names on
    <code>OauthTokenExchangeHandler</code> and <code>OauthTokenExchHandlerApp</code>
    reflect the schema in API version 63.0 (Spring '26). Introspect your org with
    <code>Schema.getGlobalDescribe()</code> if field names differ.
  </div>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:28px 0 12px;">Step 4 — Call the Token Exchange Endpoint (Server Code)</h3>

<pre class="lws-diagram">
POST https://login.salesforce.com/services/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&amp;client_id=&lt;External Client App Consumer Key&gt;
&amp;subject_token=&lt;IdP id_token&gt;
&amp;subject_token_type=urn:ietf:params:oauth:token-type:id_token
</pre>

  <p style="font-size:15px;color:var(--text-dim);line-height:1.8;margin-top:16px;">
    A successful response returns <code>access_token</code> and <code>instance_url</code>.
    To resolve the Salesforce username of the resulting session, call
    <code>GET {instance_url}/services/oauth2/userinfo</code> with the access token.
  </p>
</div>

<!-- 05 — COMPARISON & GUIDANCE -->
<div class="section">
  <div class="section-label">05 — Architecture Guidance</div>
  <div class="section-title">Choosing Between the Two Patterns</div>
  <p class="section-desc">
    Both patterns achieve the same outcome — a user-scoped Salesforce session — but suit
    different integration architectures. The following guidance covers the most common
    decision points.
  </p>

  <div class="data-grid" style="grid-template-columns: 1.2fr 1fr 1fr;">
    <div class="cell hdr">Scenario</div>
    <div class="cell hdr center">JWT Bearer</div>
    <div class="cell hdr center last-col">Token Exchange</div>

    <div class="cell dim">Your app already has an IdP login flow</div>
    <div class="cell center"><span class="partial">Works, but identity is asserted by the server</span></div>
    <div class="cell center last-col"><span class="yes">Natural fit — reuse the existing session token</span></div>

    <div class="cell dim">Background / scheduled jobs with no user session</div>
    <div class="cell center"><span class="yes">Ideal — no user session needed</span></div>
    <div class="cell center last-col"><span class="no">Requires a valid IdP token — not available without a login</span></div>

    <div class="cell dim">Multi-tenant: each customer has a different Salesforce username</div>
    <div class="cell center"><span class="yes">Pass the target username per request</span></div>
    <div class="cell center last-col"><span class="yes">Embed the Salesforce username in the IdP token claim</span></div>

    <div class="cell dim">Compliance: no long-lived server credentials</div>
    <div class="cell center"><span class="partial">Private key is long-lived; rotate on a schedule</span></div>
    <div class="cell center last-col"><span class="yes">Server holds short-lived IdP tokens only</span></div>

    <div class="cell dim">Salesforce org type</div>
    <div class="cell center">External Client App (API 63.0+)</div>
    <div class="cell center last-col">External Client App (API 63.0+)</div>

    <div class="cell dim last-row">Custom code on Salesforce side</div>
    <div class="cell center last-row"><span class="yes">None required</span></div>
    <div class="cell center last-col last-row"><span class="partial">Apex handler required</span></div>
  </div>

  <h3 style="font-size:22px;font-weight:700;color:var(--text);margin:36px 0 12px;">Key Considerations</h3>

  <div class="callout warning">
    <strong>JWT Bearer — Pre-authorisation is mandatory.</strong>
    Users must be pre-authorised on the External Client App before the first token request.
    A request for a user who is not pre-authorised returns an immediate error.
    Automate pre-authorisation via Profiles or Permission Sets assigned to the External Client App.
  </div>

  <div class="callout warning">
    <strong>Token Exchange — Apex handler is the security boundary.</strong>
    The handler runs with system privileges. Ensure it validates the token's identity claim,
    checks the <code>appDeveloperName</code> against an allowlist, and returns
    <code>null</code> (not an error) for any token that should not be trusted.
    Returning a User record grants that user a full Salesforce session.
  </div>

  <div class="callout info">
    <strong>Refresh tokens &amp; caching.</strong> Both flows support
    <code>refresh_token</code> scope. Cache access tokens for their full lifetime
    and refresh proactively rather than waiting for a 401 response. For the JWT Bearer flow,
    re-minting a JWT and calling the token endpoint again is also a valid — and often
    simpler — refresh strategy.
  </div>

  <div class="callout success">
    <strong>Both patterns keep credentials server-side.</strong>
    Neither flow exposes a Salesforce password, session cookie, or private key to the
    browser. The client application only ever sees the resulting <code>access_token</code>
    (or an opaque session identifier if your server proxies Salesforce calls).
    This is the primary security advantage of server-to-server token acquisition over
    interactive OAuth flows for machine-to-machine integrations.
  </div>
</div>

</div>
`;

export default html;
