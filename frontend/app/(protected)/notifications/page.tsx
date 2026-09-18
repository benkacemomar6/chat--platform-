"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await api.get<{ notifications?: Notification[] }>("/api/notifications", { signal: controller.signal });
        if (!controller.signal.aborted) setItems(data.notifications ?? []);
      } catch (failure) {
        if (!controller.signal.aborted) setError(apiError(failure, "Could not load notifications"));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  async function markRead(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      const { data } = await api.patch<{ success?: boolean; message?: string }>(`/api/notifications/${encodeURIComponent(id)}/read`);
      if (!data.success) { setError(data.message || "Could not update notification"); return; }
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (failure) { setError(apiError(failure, "Could not update notification")); }
    finally { setBusyId(null); }
  }

  return <main className="mx-auto w-full max-w-3xl overflow-y-auto p-6">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <button disabled={loading || !!busyId} onClick={() => { setLoading(true); setError(""); setAttempt((n) => n + 1); }} className="rounded border px-3 py-2 disabled:opacity-50">Refresh</button>
    </div>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    {loading ? <p role="status">Loading...</p> : items.length === 0 ? <p>No notifications.</p> :
      <ul className="space-y-3">{items.map((item) => <li key={item.id} className="space-y-2 rounded border bg-white p-4">
        <p className="whitespace-pre-wrap break-words">{item.message}</p>
        <p className="text-sm text-gray-600">{item.type} · {item.read ? "Read" : "Unread"} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p>
        {!item.read && <button disabled={!!busyId} onClick={() => void markRead(item.id)} className="rounded border px-3 py-1 disabled:opacity-50">{busyId === item.id ? "Saving..." : "Mark as read"}</button>}
      </li>)}</ul>}
  </main>;
}
