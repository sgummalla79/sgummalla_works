<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, Button, TextInput } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import {
  initiateAuth0,
  fetchAuth0Connections,
  type Auth0Connection,
} from "../../api/auth";

const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");
const connections = ref<Auth0Connection[]>([]);

onMounted(async () => {
  connections.value = await fetchAuth0Connections();
});

async function handleLogin() {
  try {
    await auth.login(email.value, password.value);
    await router.push({ name: "auths" });
  } catch {
    // error is set in the store
  }
}
</script>

<template>
  <AppLayout active-page="">
    <div class="vz-login-card">
      <div v-if="auth.error" class="vz-login-card__error" role="alert">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          style="flex-shrink: 0"
        >
          <circle
            cx="8"
            cy="8"
            r="7"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M8 5v3.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <circle cx="8" cy="11" r=".75" fill="currentColor" />
        </svg>
        {{ auth.error }}
      </div>

      <form class="vz-login-card__form" @submit.prevent="handleLogin">
        <TextInput
          v-model="email"
          type="email"
          name="email"
          placeholder="Email address"
          autocomplete="email"
          :required="true"
          @focus="auth.clearError()"
        />
        <TextInput
          v-model="password"
          type="password"
          name="password"
          placeholder="Password"
          autocomplete="current-password"
          :required="true"
          @focus="auth.clearError()"
        />
        <Button type="submit" :loading="auth.loading" :full-width="true"
          >Sign In</Button
        >
      </form>

      <div class="vz-login-card__divider">
        <span class="vz-login-card__divider-line" />
        <span class="vz-login-card__divider-text">or</span>
        <span class="vz-login-card__divider-line" />
      </div>

      <div class="vz-login-card__connections">
        <template v-if="connections.length > 0">
          <Button
            v-for="conn in connections"
            :key="conn.name"
            variant="primary"
            :full-width="true"
            @click="initiateAuth0(conn.name)"
          >
            <template v-if="conn.strategy === 'google-oauth2'">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                style="flex-shrink: 0"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </template>
            <span
              v-else
              class="vz-connection-dot"
              :data-strategy="conn.strategy"
            />
            Continue with {{ conn.label }}
          </Button>
        </template>
        <Button
          v-else
          variant="primary"
          :full-width="true"
          @click="initiateAuth0()"
        >
          <span class="vz-auth0-dot" />
          Continue with Auth0
        </Button>
      </div>
    </div>

    <template #footer>
      <div class="vz-login-footer-live">
        <span class="vz-login-footer-dot" />
        Live
      </div>
      <span class="vz-login-footer-tagline"
        >Ideas in Motion, Think. Build. Demo.</span
      >
    </template>
  </AppLayout>
</template>

<style scoped src="./LoginView.css"></style>
