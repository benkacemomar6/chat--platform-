"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import type { AuthResponse } from "@/lib/types";
import { storeAuthTokens } from "@/lib/auth-storage";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<AuthResponse>("/api/auth/register", { username: username.trim(), email, password });
      if (!data.success) { setError(data.message || "Registration failed"); return; }
      if (!data.accessToken || !data.refreshToken) throw new Error("Missing authentication tokens");
      storeAuthTokens(data.accessToken, data.refreshToken);
      router.replace("/chat");
    } catch (failure) { setError(apiError(failure, "Registration failed")); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-md p-6">
    <form onSubmit={register} className="flex flex-col gap-4 rounded border bg-white p-6">
      <h1 className="text-2xl font-bold">Register</h1>
      <label htmlFor="username">Username</label>
      <input id="username" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded border p-2" />
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border p-2" />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border p-2" />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="rounded bg-gray-800 p-2 text-white disabled:opacity-50">{busy ? "Registering..." : "Register"}</button>
      <Link href="/login" className="underline">Back to login</Link>
    </form>
  </main>;
}
