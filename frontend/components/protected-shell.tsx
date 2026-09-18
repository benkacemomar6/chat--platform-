"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import type { Profile } from "@/lib/types";
import { disconnectSocket, getSocket } from "@/lib/socket";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth-storage";

const ProfileContext = createContext<Profile | null>(null);
const UpdateProfileContext = createContext<(profile: Profile) => void>(() => {});
export function useUpdateProfile() { return useContext(UpdateProfileContext); }

export function useProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile requires ProtectedShell");
  return profile;
}

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    function leave() {
      controller.abort();
      disconnectSocket();
      setProfile(null);
      router.replace("/login");
    }
    function onStorage(event: StorageEvent) {
      if (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY || event.key === null) leave();
    }
    window.addEventListener("auth:expired", leave);
    window.addEventListener("storage", onStorage);
    async function loadProfile() {
      if (!getAccessToken() && !getRefreshToken()) { leave(); return; }
      try {
        const response = await api.get<Profile>("/api/users/me", { signal: controller.signal });
        if (!controller.signal.aborted) setProfile(response.data);
      } catch (failure) {
        if (!controller.signal.aborted) setError(apiError(failure, "Could not load your profile."));
      }
    }
    void loadProfile();
    return () => {
      controller.abort();
      window.removeEventListener("auth:expired", leave);
      window.removeEventListener("storage", onStorage);
    };
  }, [router, attempt]);

  useEffect(() => {
    if (!profile?.userId) return;
    const socket = getSocket();
    function authError(error: Error) {
      if (error.message === "Invalid token" || error.message === "Authentication token missing") {
        clearAuthTokens();
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    socket.on("connect_error", authError);
    socket.connect();
    return () => { socket.off("connect_error", authError); disconnectSocket(); };
  }, [profile?.userId]);

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post("/api/auth/logout", { refreshToken });
    } finally {
      clearAuthTokens();
      window.dispatchEvent(new Event("auth:expired"));
    }
  }

  if (!profile) return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      {error ? <>
        <p role="alert">{error}</p>
        <button className="rounded border p-3" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Try again</button>
        <button onClick={() => void logout()}>Back to login</button>
      </> : <p role="status">Loading your profile…</p>}
    </main>
  );

  return <ProfileContext.Provider value={profile}><UpdateProfileContext.Provider value={setProfile}>
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/chat" className="text-xl font-bold">Chat Platform</Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm">
          <Link href="/chat">Chat</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/notifications">Notifications</Link>
          <button onClick={() => void logout()} className="rounded-lg border border-slate-300 px-3 py-2">Log out</button>
        </nav>
      </header>
      {children}
    </div>
  </UpdateProfileContext.Provider></ProfileContext.Provider>;
}
