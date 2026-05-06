import axios, { type AxiosError, type AxiosInstance } from "axios";

// ── Base instance ─────────────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  // In dev, Vite proxies /api to Express so no CORS issues.
  // In production, VITE_API_URL points to the deployed server.
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  withCredentials: true, // send httpOnly cookie on every request
  headers: {
    "Content-Type": "application/json",
    "Intl-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  timeout: 10_000,
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Normalises error shape so callers always get { message: string }.

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "An unexpected error occurred";

    return Promise.reject(new Error(message));
  },
);

export default client;
