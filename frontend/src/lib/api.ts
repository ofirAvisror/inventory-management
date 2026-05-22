import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

type BackendError = {
  message?: string;
  error?: { message?: string };
};

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<BackendError>(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
