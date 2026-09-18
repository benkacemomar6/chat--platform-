import axios, { type InternalAxiosRequestConfig } from "axios";
import { clearAuthTokens, getAccessToken, getRefreshToken, storeAuthTokens } from "@/lib/auth-storage";
import { disconnectSocket } from "@/lib/socket";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

const refreshClient = axios.create({ baseURL, timeout: 15000 });
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type RefreshResponse = { success?: boolean; accessToken?: string; refreshToken?: string };
let refreshPromise: Promise<string> | null = null;

function expireAuthentication() {
  clearAuthTokens();
  disconnectSocket();
  window.dispatchEvent(new Event("auth:expired"));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  const { data } = await refreshClient.post<RefreshResponse>("/api/auth/refresh", { refreshToken });
  if (!data.success || !data.accessToken || !data.refreshToken) {
    throw new Error("Refresh failed");
  }

  storeAuthTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined" || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableConfig | undefined;
    const url = originalRequest?.url || "";
    const cannotRefresh = !originalRequest || originalRequest._retry ||
      url.startsWith("/api/auth/login") ||
      url.startsWith("/api/auth/register") ||
      url.startsWith("/api/auth/refresh");

    if (cannotRefresh) return Promise.reject(error);
    originalRequest._retry = true;

    try {
      // All concurrent 401 responses wait for the same rotation. Without this
      // lock, each request would try to spend the same one-time refresh token.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch {
      expireAuthentication();
      return Promise.reject(error);
    }
  },
);

export default api;
