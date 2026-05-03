<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  open: boolean;
  flow: "jwt-bearer" | "token-exchange";
}>();

const emit = defineEmits<{
  close: [];
  register: [];
}>();

function handleRegister() {
  emit("close");
  emit("register");
}

// ── Certificate generator ────────────────────────────────────────────────────

const certCN = ref("sgummalla-works");
const generating = ref(false);
const generated = ref(false);
const privateKeyPem = ref("");
const certificatePem = ref("");

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function derLen(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function der(tag: number, ...parts: Uint8Array[]): Uint8Array {
  const body = concat(...parts);
  return concat(new Uint8Array([tag]), derLen(body.length), body);
}

function utcTime(date: Date): Uint8Array {
  const s = date.toISOString().replace(/[-:T]/g, "").slice(2, 14) + "Z";
  const b = new TextEncoder().encode(s);
  return concat(new Uint8Array([0x17, b.length]), b);
}

function toPem(buffer: ArrayBuffer, label: string): string {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const lines = (b64.match(/.{1,64}/g) ?? []).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

async function generateCertificate() {
  generating.value = true;
  generated.value = false;
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );

    // Private key PEM
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    privateKeyPem.value = toPem(pkcs8, "PRIVATE KEY");

    // Self-signed X.509 certificate
    const spki = new Uint8Array(
      await crypto.subtle.exportKey("spki", keyPair.publicKey),
    );
    const cn = new TextEncoder().encode(certCN.value || "sgummalla-works");

    const SHA256RSA = new Uint8Array([
      0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
    ]);
    const CN_OID = new Uint8Array([0x55, 0x04, 0x03]);

    const algoId = der(
      0x30,
      der(0x06, SHA256RSA),
      new Uint8Array([0x05, 0x00]),
    );
    const name = der(
      0x30,
      der(0x31, der(0x30, der(0x06, CN_OID), der(0x0c, cn))),
    );
    const now = new Date();
    const validity = der(
      0x30,
      utcTime(now),
      utcTime(new Date(now.getTime() + 3650 * 86400000)),
    );

    const tbs = der(
      0x30,
      der(0xa0, der(0x02, new Uint8Array([0x02]))), // v3
      der(0x02, new Uint8Array([0x01])), // serial
      algoId,
      name,
      validity,
      name,
      spki,
    );

    const tbsBuf = tbs.buffer.slice(
      tbs.byteOffset,
      tbs.byteOffset + tbs.byteLength,
    ) as ArrayBuffer;
    const sig = new Uint8Array(
      await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, tbsBuf),
    );
    const cert = der(0x30, tbs, algoId, der(0x03, new Uint8Array([0x00]), sig));

    const certBuf = cert.buffer.slice(
      cert.byteOffset,
      cert.byteOffset + cert.byteLength,
    ) as ArrayBuffer;
    certificatePem.value = toPem(certBuf, "CERTIFICATE");
    generated.value = true;
  } finally {
    generating.value = false;
  }
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-setup-fade">
      <div v-if="open" class="sf-setup-overlay" @click.self="$emit('close')">
        <div
          class="sf-setup-modal"
          :class="{ 'sf-setup-modal--wide': flow === 'token-exchange' }"
        >
          <!-- Header -->
          <div class="sf-setup-header">
            <div class="sf-setup-header__left">
              <svg
                class="sf-setup-header__sf-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M10.12 3.27a5.1 5.1 0 0 1 3.61 1.5 6.12 6.12 0 0 1 3.74-1.27 6.18 6.18 0 0 1 6.18 6.18 6.18 6.18 0 0 1-6.18 6.18H5.25A4.25 4.25 0 0 1 1 11.62a4.25 4.25 0 0 1 4.25-4.25c.17 0 .34.01.5.03A5.09 5.09 0 0 1 10.12 3.27z"
                />
              </svg>
              <div>
                <p class="sf-setup-header__eyebrow">Salesforce Setup Guide</p>
                <p class="sf-setup-header__title">
                  {{
                    flow === "jwt-bearer"
                      ? "JWT Bearer Authentication"
                      : "Token Exchange Authentication"
                  }}
                </p>
              </div>
            </div>
            <button class="sf-setup-close" @click="$emit('close')">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="sf-setup-body">
            <!-- ── Cert generator (shared) ─────────────────────────── -->
            <div class="sf-cert-box">
              <div class="sf-cert-box__header">
                <div>
                  <p class="sf-cert-box__title">Generate RSA Key Pair</p>
                  <p class="sf-cert-box__desc">
                    Create a private key and self-signed certificate directly in
                    your browser — nothing is sent to any server.
                  </p>
                </div>
              </div>
              <div class="sf-cert-box__controls">
                <div class="sf-cert-box__cn">
                  <label class="sf-cert-box__label"
                    >Certificate CN (app name)</label
                  >
                  <input
                    v-model="certCN"
                    class="sf-cert-box__input"
                    placeholder="sgummalla-works"
                  />
                </div>
                <button
                  class="sf-cert-box__btn"
                  :disabled="generating"
                  @click="generateCertificate"
                >
                  <svg
                    v-if="generating"
                    class="sf-cert-spinner"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                  </svg>
                  <svg
                    v-else
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {{ generating ? "Generating…" : "Generate" }}
                </button>
              </div>
              <div v-if="generated" class="sf-cert-box__downloads">
                <button
                  class="sf-cert-dl sf-cert-dl--key"
                  @click="download(privateKeyPem, 'private.pem')"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download private.pem
                </button>
                <button
                  class="sf-cert-dl sf-cert-dl--cert"
                  @click="download(certificatePem, 'certificate.crt')"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download certificate.crt
                </button>
              </div>
              <p v-if="generated" class="sf-cert-box__note">
                ✓ Generated — upload <strong>certificate.crt</strong> to
                Salesforce. Paste <strong>private.pem</strong> when registering
                below.
              </p>
            </div>

            <!-- ── JWT Bearer ────────────────────────────────────────── -->
            <template v-if="flow === 'jwt-bearer'">
              <div class="sf-setup-steps">
                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">1</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Upload the Certificate to Salesforce
                    </p>
                    <p class="sf-setup-step__desc">
                      Generate the key pair above, then in Salesforce:<br />
                      Setup → <strong>Certificate and Key Management</strong> →
                      <strong>Import from Keystore</strong> or
                      <strong>Upload Certificate</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Certificate Label</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;certificate_name&gt;</code
                            >
                            — this exact API name is referenced in the Apex
                            handler
                          </td>
                        </tr>
                        <tr>
                          <td>File</td>
                          <td>
                            Upload the
                            <code class="sf-setup-inline">certificate.crt</code>
                            downloaded above
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">2</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Create an External Client App
                    </p>
                    <p class="sf-setup-step__desc">
                      Setup → <strong>External Client Apps</strong> →
                      <strong>New External Client App</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Label</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;external_client_app_name&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>App Developer Name</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;external_client_app_name&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Contact Email</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;your_email&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Distribution State</td>
                          <td>Local</td>
                        </tr>
                        <tr>
                          <td>Enable OAuth Settings</td>
                          <td>Checked</td>
                        </tr>
                        <tr>
                          <td>Callback URL</td>
                          <td>
                            <code class="sf-setup-inline"
                              >https://localhost</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Use Digital Signatures</td>
                          <td>
                            Checked → select
                            <code class="sf-setup-inline"
                              >&lt;certificate_name&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Selected OAuth Scopes</td>
                          <td>
                            <code class="sf-setup-inline">api</code>,
                            <code class="sf-setup-inline">refresh_token</code>,
                            <code class="sf-setup-inline">web</code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">3</span>
                  <div>
                    <p class="sf-setup-step__title">Configure OAuth Policies</p>
                    <p class="sf-setup-step__desc">
                      External Client Apps →
                      <strong>&lt;external_client_app_name&gt;</strong> →
                      <strong>Edit Policies</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Permitted Users</td>
                          <td>
                            <strong
                              >Admin approved users are pre-authorized</strong
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>IP Relaxation</td>
                          <td>Relax IP restrictions (Bypass)</td>
                        </tr>
                        <tr>
                          <td>Pre-authorize</td>
                          <td>Add target user via Profile or Permission Set</td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="sf-setup-step__note">
                      Every Salesforce user who needs a JWT Bearer token must be
                      pre-authorized. Requests for non-authorized users fail
                      immediately.
                    </p>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">4</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Copy the Consumer Key &amp; Register
                    </p>
                    <p class="sf-setup-step__desc">
                      External Client Apps →
                      <strong>&lt;external_client_app_name&gt;</strong> → copy
                      the <strong>Consumer Key</strong>. Use
                      <code class="sf-setup-inline"
                        >&lt;your_org_login_url&gt;</code
                      >
                      as the Login URL. Paste the Consumer Key and your
                      <code class="sf-setup-inline">private.pem</code> when
                      registering below.
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── Token Exchange ────────────────────────────────────── -->
            <template v-else>
              <div class="sf-setup-steps">
                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">1</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Upload the Certificate to Salesforce
                    </p>
                    <p class="sf-setup-step__desc">
                      Generate the key pair using the tool above, then upload
                      the certificate to Salesforce so the Apex handler can
                      validate incoming tokens:<br />
                      Setup → <strong>Certificate and Key Management</strong> →
                      <strong>Upload Certificate</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Certificate Label / API Name</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;certificate_name&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>File</td>
                          <td>
                            Upload
                            <code class="sf-setup-inline">certificate.crt</code>
                            downloaded above
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="sf-setup-step__note">
                      The API name you choose here must be used verbatim in the
                      <code class="sf-setup-inline"
                        >Auth.JWTUtil.validateJWTWithCert</code
                      >
                      call in the Apex handler (Step 3). The Auth0 id_token must
                      also be signed with the matching private key for
                      validation to succeed.
                    </p>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">2</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Create an External Client App
                    </p>
                    <p class="sf-setup-step__desc">
                      Setup → <strong>External Client Apps</strong> →
                      <strong>New External Client App</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Label</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;external_client_app_name&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>App Developer Name</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;external_client_app_name&gt;</code
                            >
                            — referenced in the Apex handler
                          </td>
                        </tr>
                        <tr>
                          <td>Contact Email</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;your_email&gt;</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Distribution State</td>
                          <td>Local</td>
                        </tr>
                        <tr>
                          <td>Selected OAuth Scopes</td>
                          <td>
                            <code class="sf-setup-inline">api</code>,
                            <code class="sf-setup-inline">refresh_token</code>,
                            <code class="sf-setup-inline">openid</code>,
                            <code class="sf-setup-inline">web</code>
                          </td>
                        </tr>
                        <tr>
                          <td>Token Exchange Grant</td>
                          <td><strong>Enable</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">3</span>
                  <div>
                    <p class="sf-setup-step__title">Deploy the Apex Handler</p>
                    <p class="sf-setup-step__desc">
                      Create this Apex class in Setup →
                      <strong>Apex Classes</strong>. It extends
                      <code class="sf-setup-inline"
                        >Auth.ExternalClientAppOauthHandler</code
                      >, validates the incoming Auth0 id_token using the
                      uploaded certificate, and looks up the Salesforce user by
                      email.
                    </p>
                    <div class="sf-setup-code sf-setup-code--apex">
                      <code
                        >public class WebAppExtClntAppHandler extends
                        Auth.ExternalClientAppOauthHandler &#123;</code
                      >
                      <code>&nbsp;</code>
                      <code
                        >&nbsp; public Auth.TokenValidationResult
                        validateIncomingToken(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; String appDeveloperName,
                        Auth.IntegratingAppType appType,</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; String incomingToken,
                        Auth.OAuth2TokenExchangeType tokenType</code
                      >
                      <code>&nbsp; ) &#123;</code>
                      <code
                        >&nbsp;&nbsp;&nbsp; if (tokenType !=
                        Auth.OAuth2TokenExchangeType.JWT)</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; return new
                        Auth.TokenValidationResult(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; false, null,
                        null, incomingToken, tokenType, 'Expected JWT');</code
                      >
                      <code>&nbsp;</code>
                      <code>&nbsp;&nbsp;&nbsp; String sub;</code>
                      <code>&nbsp;&nbsp;&nbsp; try &#123;</code>
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Auth.JWT jwt =
                        Auth.JWTUtil.validateJWTWithCert(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        incomingToken, '&lt;certificate_name&gt;');</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; sub =
                        jwt.getSub();</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; &#125; catch (Exception e)
                        &#123;</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; return new
                        Auth.TokenValidationResult(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; false, null,
                        null, incomingToken, tokenType,</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 'JWT
                        validation failed: ' + e.getMessage());</code
                      >
                      <code>&nbsp;&nbsp;&nbsp; &#125;</code>
                      <code>&nbsp;</code>
                      <code
                        >&nbsp;&nbsp;&nbsp; Auth.UserData userData = new
                        Auth.UserData(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; null, null, null, null,
                        sub, null, sub, null, 'WebApp', null, null);</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; return new
                        Auth.TokenValidationResult(</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; true, null, userData,
                        incomingToken, tokenType, null);</code
                      >
                      <code>&nbsp; &#125;</code>
                      <code>&nbsp;</code>
                      <code>&nbsp; public User getUserForTokenSubject(</code>
                      <code
                        >&nbsp;&nbsp;&nbsp; Id networkId,
                        Auth.TokenValidationResult result,</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; Boolean canCreateUser, String
                        appDeveloperName, Auth.IntegratingAppType appType</code
                      >
                      <code>&nbsp; ) &#123;</code>
                      <code
                        >&nbsp;&nbsp;&nbsp; String email =
                        result.userData.email;</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; List&lt;User&gt; users = [SELECT Id
                        FROM User</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; WHERE Email = :email AND
                        IsActive = true LIMIT 1];</code
                      >
                      <code
                        >&nbsp;&nbsp;&nbsp; return users.isEmpty() ? null :
                        users[0];</code
                      >
                      <code>&nbsp; &#125;</code>
                      <code>&#125;</code>
                    </div>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">4</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Register the Token Exchange Handler
                    </p>
                    <p class="sf-setup-step__desc">
                      In Setup → <strong>Token Exchange Handlers</strong> (or
                      via Metadata API), create an
                      <code class="sf-setup-inline"
                        >OauthTokenExchangeHandler</code
                      >
                      record pointing to the Apex class.
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Developer Name</td>
                          <td>
                            <code class="sf-setup-inline"
                              >WebAppExtClntAppHandler</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Master Label</td>
                          <td>WebApp Ext Client App Handler</td>
                        </tr>
                        <tr>
                          <td>Apex Handler Class</td>
                          <td>
                            <code class="sf-setup-inline"
                              >WebAppExtClntAppHandler</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Enabled</td>
                          <td>Checked</td>
                        </tr>
                        <tr>
                          <td>JWT Supported</td>
                          <td>Checked</td>
                        </tr>
                        <tr>
                          <td>Access Token Supported</td>
                          <td>Checked</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">5</span>
                  <div>
                    <p class="sf-setup-step__title">Configure OAuth Policies</p>
                    <p class="sf-setup-step__desc">
                      External Client Apps →
                      <strong>&lt;external_client_app_name&gt;</strong> →
                      <strong>Edit Policies</strong>
                    </p>
                    <table class="sf-setup-table">
                      <tbody>
                        <tr>
                          <td>Apex Handler</td>
                          <td>
                            <code class="sf-setup-inline"
                              >WebAppExtClntAppHandler</code
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>Execute Handler As</td>
                          <td>
                            <code class="sf-setup-inline"
                              >&lt;your_process_user&gt;</code
                            >
                            — automated process / integration user
                          </td>
                        </tr>
                        <tr>
                          <td>Permitted Users</td>
                          <td>
                            <strong
                              >Admin approved users are pre-authorized</strong
                            >
                          </td>
                        </tr>
                        <tr>
                          <td>IP Relaxation</td>
                          <td>Relax IP restrictions (Bypass)</td>
                        </tr>
                        <tr>
                          <td>Token Exchange Flow</td>
                          <td><strong>Enable</strong></td>
                        </tr>
                        <tr>
                          <td>Authorized Users</td>
                          <td>
                            Add via Profile:
                            <code class="sf-setup-inline"
                              >System Administrator</code
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="sf-setup-step">
                  <span class="sf-setup-step__num">6</span>
                  <div>
                    <p class="sf-setup-step__title">
                      Copy the Consumer Key &amp; Register
                    </p>
                    <p class="sf-setup-step__desc">
                      External Client Apps →
                      <strong>&lt;external_client_app_name&gt;</strong> → copy
                      the <strong>Consumer Key</strong>. Use
                      <code class="sf-setup-inline"
                        >&lt;your_org_login_url&gt;</code
                      >
                      as the Login URL. No private key is needed — the web app's
                      Auth0 session token is used directly.
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="sf-setup-footer">
            <button class="sf-setup-footer__cancel" @click="$emit('close')">
              Close
            </button>
            <button class="sf-setup-footer__register" @click="handleRegister">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Register client
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sf-setup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 450;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.sf-setup-modal {
  background: var(--vz-bg);
  border: 1px solid var(--vz-border);
  border-radius: 12px;
  width: 640px;
  max-width: calc(100vw - 2rem);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  /* clip instead of hidden so internal scroll containers still work */
  overflow: clip;
}

.sf-setup-modal--wide {
  width: 920px;
}

/* ── Header ── */
.sf-setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--vz-border);
  background: var(--vz-surface);
  flex-shrink: 0;
}

.sf-setup-header__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sf-setup-header__sf-icon {
  width: 28px;
  height: 28px;
  color: #00a1e0;
  flex-shrink: 0;
}

.sf-setup-header__eyebrow {
  font-family: var(--vz-font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.sf-setup-header__title {
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--vz-text);
  margin-top: 0.1rem;
}

.sf-setup-close {
  background: none;
  border: none;
  color: var(--vz-text3);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--vz-radius-sm);
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    background 0.15s;
}

.sf-setup-close:hover {
  color: var(--vz-text);
  background: var(--vz-surface2);
}

/* ── Body ── */
.sf-setup-body {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Cert generator box ── */
.sf-cert-box {
  background: var(--vz-surface);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sf-cert-box__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.sf-cert-box__title {
  font-size: 0.975rem;
  font-weight: 600;
  color: var(--vz-text);
}

.sf-cert-box__desc {
  font-size: 0.88rem;
  color: var(--vz-text3);
  margin-top: 0.15rem;
  line-height: 1.5;
}

.sf-cert-box__controls {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.sf-cert-box__cn {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sf-cert-box__label {
  font-family: var(--vz-font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.sf-cert-box__input {
  background: var(--vz-bg);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  padding: 0.45rem 0.7rem;
  font-family: var(--vz-font-mono);
  font-size: 0.88rem;
  color: var(--vz-text);
  outline: none;
  transition: border-color 0.15s;
}

.sf-cert-box__input:focus {
  border-color: var(--vz-border2);
}

.sf-cert-box__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  color: var(--vz-text);
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  padding: 0.45rem 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.sf-cert-box__btn:hover:not(:disabled) {
  background: var(--vz-bg);
  border-color: var(--vz-text3);
}

.sf-cert-box__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sf-cert-spinner {
  animation: sf-spin 0.9s linear infinite;
}

@keyframes sf-spin {
  to {
    transform: rotate(360deg);
  }
}

.sf-cert-box__downloads {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sf-cert-dl {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  border-radius: var(--vz-radius-sm);
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  border: 1px solid;
  transition: opacity 0.15s;
}

.sf-cert-dl:hover {
  opacity: 0.8;
}

.sf-cert-dl--key {
  color: var(--vz-green);
  background: rgba(74, 222, 128, 0.08);
  border-color: var(--vz-green);
}

.sf-cert-dl--cert {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.08);
  border-color: #60a5fa;
}

.sf-cert-box__note {
  font-size: 0.975rem;
  color: var(--vz-green);
  line-height: 1.5;
}

/* ── Steps ── */
.sf-setup-steps {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sf-setup-step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 0.875rem;
  align-items: start;
}

.sf-setup-step__num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vz-text2);
  flex-shrink: 0;
}

.sf-setup-step__title {
  font-size: 0.975rem;
  font-weight: 600;
  color: var(--vz-text);
  margin-bottom: 0.3rem;
}

.sf-setup-step__desc {
  font-size: 0.925rem;
  color: var(--vz-text2);
  line-height: 1.55;
  margin-bottom: 0.5rem;
}

.sf-setup-step__note {
  font-size: 0.975rem;
  color: var(--vz-text3);
  line-height: 1.5;
  margin-top: 0.5rem;
}

.sf-setup-note--highlight {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: var(--vz-radius-md);
  border: 1px solid
    color-mix(in srgb, var(--vz-amber, #f59e0b) 40%, transparent);
  background: color-mix(in srgb, var(--vz-amber, #f59e0b) 8%, transparent);
  font-size: 0.975rem;
  color: var(--vz-text2);
  line-height: 1.55;
}

.sf-setup-note--highlight svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--vz-amber, #f59e0b);
}

.sf-setup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sf-setup-list li {
  font-size: 0.925rem;
  color: var(--vz-text2);
  line-height: 1.5;
  padding-left: 1rem;
  position: relative;
}

.sf-setup-list li::before {
  content: "–";
  position: absolute;
  left: 0;
  color: var(--vz-text3);
}

.sf-setup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.sf-setup-table tr {
  border-bottom: 1px solid var(--vz-border);
}

.sf-setup-table tr:last-child {
  border-bottom: none;
}

.sf-setup-table td {
  padding: 0.4rem 0.6rem;
  color: var(--vz-text2);
  vertical-align: top;
}

.sf-setup-table td:first-child {
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  color: var(--vz-text3);
  white-space: nowrap;
  width: 38%;
}

.sf-setup-code {
  background: var(--vz-surface);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  padding: 0.65rem 0.875rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  /* Establish own scroll context so parent overflow-x: hidden doesn't block it */
  display: block;
}

.sf-setup-code code {
  display: block;
  font-family: var(--vz-font-mono);
  font-size: 0.95rem;
  color: var(--vz-green);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
}

.sf-setup-code--apex code {
  color: #93c5fd;
}

.sf-setup-inline {
  font-family: var(--vz-font-mono);
  font-size: 1.0em;
  color: var(--vz-text);
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border);
  border-radius: 3px;
  padding: 0.05em 0.35em;
}

/* ── Footer ── */
.sf-setup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--vz-border);
  background: var(--vz-surface);
  flex-shrink: 0;
}

.sf-setup-footer__cancel {
  font-family: var(--vz-font-sans);
  font-size: 0.95rem;
  color: var(--vz-text3);
  background: none;
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  padding: 0.45rem 0.875rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.sf-setup-footer__cancel:hover {
  color: var(--vz-text);
  border-color: var(--vz-border2);
}

.sf-setup-footer__register {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-sans);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vz-bg);
  background: var(--vz-text);
  border: 1px solid var(--vz-text);
  border-radius: var(--vz-radius-md);
  padding: 0.45rem 0.875rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.sf-setup-footer__register:hover {
  opacity: 0.85;
}

/* ── Transition ── */
.sf-setup-fade-enter-active,
.sf-setup-fade-leave-active {
  transition: opacity 0.2s;
}
.sf-setup-fade-enter-from,
.sf-setup-fade-leave-to {
  opacity: 0;
}
</style>
