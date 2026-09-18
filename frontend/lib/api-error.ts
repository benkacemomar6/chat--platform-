import axios from "axios";

export function apiError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.status === 401) return "Your session has expired. Please log in again.";
    if (typeof error.response?.data?.message === "string") return error.response.data.message;
    if (!error.response) return "Could not reach the server. Please try again.";
  }
  return fallback;
}
