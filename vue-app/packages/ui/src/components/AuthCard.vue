<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  protocol: "jwt" | "saml" | "oidc" | "auth0" | "token-exchange";
  status?: "active" | "inactive";
}>();

const protocolLabel: Record<string, string> = {
  jwt: "JWT Bearer",
  saml: "SAML 2.0",
  oidc: "OIDC",
  auth0: "Auth0",
  "token-exchange": "Token Exchange",
};
</script>

<template>
  <div class="vz-auth-card">
    <div class="vz-auth-card__top">
      <span class="vz-auth-card__tag" :class="`vz-auth-card__tag--${protocol}`">
        {{ protocolLabel[protocol] }}
      </span>
      <span
        class="vz-auth-card__status"
        :class="{ 'vz-auth-card__status--active': status === 'active' }"
      >
        <span class="vz-auth-card__status-dot" />
        {{ status === "active" ? "Active" : "Inactive" }}
      </span>
    </div>

    <div class="vz-auth-card__title">{{ title }}</div>
    <div class="vz-auth-card__desc">{{ description }}</div>

    <div class="vz-auth-card__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.vz-auth-card {
  background: var(--vz-bg);
  padding: 1.4rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  transition: background 0.15s;
}

.vz-auth-card:hover {
  background: var(--vz-surface);
}

.vz-auth-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vz-auth-card__tag {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: var(--vz-radius-sm);
}

.vz-auth-card__tag--jwt {
  background: var(--vz-tag-jwt-bg);
  color: var(--vz-tag-jwt-text);
}

.vz-auth-card__tag--saml {
  background: var(--vz-tag-saml-bg);
  color: var(--vz-tag-saml-text);
}

.vz-auth-card__tag--oidc {
  background: var(--vz-tag-oidc-bg);
  color: var(--vz-tag-oidc-text);
}

.vz-auth-card__tag--auth0 {
  background: var(--vz-tag-auth0-bg);
  color: var(--vz-tag-auth0-text);
}

.vz-auth-card__tag--token-exchange {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
}

.vz-auth-card__status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--vz-font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--vz-text3);
  text-transform: uppercase;
}

.vz-auth-card__status--active {
  color: var(--vz-green);
}

.vz-auth-card__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: vz-pulse 2.5s ease-in-out infinite;
}

@keyframes vz-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.vz-auth-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vz-text);
}

.vz-auth-card__desc {
  font-size: 0.875rem;
  color: var(--vz-text2);
  line-height: 1.6;
  flex: 1;
}

.vz-auth-card__action {
  margin-top: 0.4rem;
}
</style>
