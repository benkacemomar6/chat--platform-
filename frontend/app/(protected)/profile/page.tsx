"use client";

import { useState, type FormEvent } from "react";
import { useProfile, useUpdateProfile } from "@/components/protected-shell";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const { data } = await api.patch<Profile>("/api/users/me", { username: username.trim(), bio, avatarUrl });
      updateProfile(data);
      setUsername(data.username || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
      setSaved(true);
    } catch (failure) { setError(apiError(failure, "Could not update profile")); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-xl overflow-y-auto p-6">
    <h1 className="mb-4 text-2xl font-bold">My profile</h1>
    <p className="mb-4 break-all text-sm">User ID: {profile.userId}</p>
    <form onSubmit={save} className="flex flex-col gap-3 rounded border bg-white p-4">
      <label htmlFor="username">Username</label>
      <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="rounded border p-2" />
      <label htmlFor="bio">Bio</label>
      <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="rounded border p-2" rows={3} />
      <label htmlFor="avatar">Avatar URL</label>
      <input id="avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="rounded border p-2" placeholder="https://example.com/avatar.png" />
      <p className="break-all text-sm text-gray-600">{profile.avatarUrl || "No avatar set."}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {saved && <p role="status">Profile saved.</p>}
      <button disabled={busy} className="rounded bg-gray-800 p-2 text-white disabled:opacity-50">{busy ? "Saving..." : "Save profile"}</button>
    </form>
  </main>;
}
