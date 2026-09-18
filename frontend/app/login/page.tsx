"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import Link from "next/link";
import type { AuthResponse } from "@/lib/types";
import { storeAuthTokens } from "@/lib/auth-storage";
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AuthResponse>("/api/auth/login", {
        email,
        password,
      });
      if (!response.data.success) {
        setError(response.data.message || "Login failed");
        return;
      }
      if (!response.data.accessToken || !response.data.refreshToken) {
        throw new Error("Missing authentication tokens");
      }
      storeAuthTokens(response.data.accessToken, response.data.refreshToken);
      router.replace("/chat");
    } catch (error) {
      setError(apiError(error, "Could not log in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded border border-gray-300 bg-white p-6"
      >
        <h1 className="text-3xl font-bold">
          Login
        </h1>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          required
          autoComplete="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          className="rounded border p-3"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          required
          autoComplete="current-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          className="rounded border p-3"
        />

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button
          disabled={loading}
          type="submit"
          className="rounded bg-gray-800 p-3 text-white disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
        <Link href="/register" className="underline">Create an account</Link>
        <Link href="/" className="underline">Home</Link>
      </form>
    </main>
  );
}
