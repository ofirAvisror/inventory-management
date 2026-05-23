import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const ADMIN_HEADER_NAME =
  import.meta.env.VITE_ADMIN_HEADER_NAME ?? "x-admin-role";
export const ADMIN_HEADER_VALUE =
  import.meta.env.VITE_ADMIN_HEADER_VALUE ?? "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const ADMIN_OVERRIDE_STORAGE_KEY = "admin-override";

// Module-level flag so the axios interceptor (which runs outside React) can
// read the current override without having to subscribe to a context.
let adminOverride: boolean = readInitialAdminOverride();

function readInitialAdminOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ADMIN_OVERRIDE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function getAdminOverride(): boolean {
  return adminOverride;
}

export function setAdminOverride(next: boolean): void {
  adminOverride = next;
  if (typeof window === "undefined") return;
  try {
    if (next) {
      window.localStorage.setItem(ADMIN_OVERRIDE_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(ADMIN_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g. Safari private mode).
  }
}

api.interceptors.request.use((config) => {
  if (adminOverride && ADMIN_HEADER_VALUE) {
    config.headers.set(ADMIN_HEADER_NAME, ADMIN_HEADER_VALUE);
  }
  return config;
});

type BackendError = {
  code?: string;
  message?: string;
  details?: unknown;
  error?: { message?: string; code?: string };
};

export interface ApiError {
  status: number | null;
  code: string | null;
  message: string;
  details?: unknown;
}

export function toApiError(error: unknown, fallback: string): ApiError {
  if (axios.isAxiosError<BackendError>(error)) {
    const data = error.response?.data;
    return {
      status: error.response?.status ?? null,
      code: data?.code ?? data?.error?.code ?? null,
      message:
        data?.error?.message ??
        data?.message ??
        error.message ??
        fallback,
      details: data?.details,
    };
  }
  if (error instanceof Error) {
    return { status: null, code: null, message: error.message };
  }
  return { status: null, code: null, message: fallback };
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  return toApiError(error, fallback).message;
}
