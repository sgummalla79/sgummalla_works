import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView/HomeView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView/LoginView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/auths",
    name: "auths",
    component: () => import("../views/AuthsView/AuthsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/configuration",
    name: "configuration",
    component: () => import("../views/ConfigurationView/ConfigurationView.vue"),
    meta: { requiresAuth: true, ownerOnly: true },
  },
  {
    path: "/salesforce/jwtbearer",
    name: "salesforce",
    component: () => import("../views/SalesforceView/SalesforceView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/salesforce/token-exchange",
    name: "salesforce-exchange",
    component: () =>
      import("../views/SalesforceExchangeView/SalesforceExchangeView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView/ProfileView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/blog",
    name: "blog",
    component: () => import("../views/BlogView/BlogView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/blog/:slug",
    name: "blog-article",
    component: () => import("../views/BlogArticleView/BlogArticleView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView/DashboardView.vue"),
    meta: { requiresAuth: true, ownerOnly: true },
  },
  {
    path: "/link-accounts",
    name: "link-accounts",
    component: () => import("../views/LinkAccountsView/LinkAccountsView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/drafts",
    name: "drafts",
    component: () => import("../views/DraftsView/DraftsView.vue"),
    meta: { requiresAuth: true, ownerOnly: true },
  },
  {
    path: "/drafts/:slug",
    name: "draft-preview",
    component: () => import("../views/DraftPreviewView/DraftPreviewView.vue"),
    meta: { requiresAuth: true, ownerOnly: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ── Navigation guard ──────────────────────────────────────────────────────────

router.beforeEach(async (to) => {
  // If a SAMLRequest lands on any Vue route, forward it to the server SSO endpoint
  if (to.query["SAMLRequest"]) {
    const params = new URLSearchParams();
    params.set("SAMLRequest", to.query["SAMLRequest"] as string);
    if (to.query["RelayState"])
      params.set("RelayState", to.query["RelayState"] as string);
    if (to.query["SigAlg"]) params.set("SigAlg", to.query["SigAlg"] as string);
    if (to.query["Signature"])
      params.set("Signature", to.query["Signature"] as string);
    window.location.href = `/api/saml/sso?${params.toString()}`;
    return false;
  }

  const auth = useAuthStore();

  // Bootstrap once — checks existing session cookie silently
  await auth.bootstrap();

  const requiresAuth = to.meta.requiresAuth !== false;

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: "login" };
  }

  if (to.meta.ownerOnly && !auth.isOwner) {
    return { name: "blog" };
  }

  if (
    !requiresAuth &&
    auth.isAuthenticated &&
    ["login", "home"].includes(to.name as string)
  ) {
    return { name: "auths" };
  }

  return true;
});

export default router;
