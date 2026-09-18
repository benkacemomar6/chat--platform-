"use client";

import { useEffect, useState, type FormEvent } from "react";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import { conversationTitle, type Conversation } from "@/lib/types";

type Props = { userId: string; selectedId?: string; onSelect: (conversation: Conversation) => void; presence: Record<string, boolean> };

export default function ConversationList({ userId, selectedId, onSelect, presence }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [participantId, setParticipantId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || !participantId.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await api.post<{ success?: boolean; conversation?: Conversation; message?: string }>("/api/chat/conversations", { participantId: participantId.trim() });
      if (!data.success || !data.conversation) { setCreateError(data.message || "Could not create conversation"); return; }
      const conversation = data.conversation;
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      onSelect(conversation);
      setParticipantId("");
    } catch (failure) { setCreateError(apiError(failure, "Could not create conversation")); }
    finally { setCreating(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await api.get<{ conversations?: Conversation[] }>("/api/chat/conversations", { signal: controller.signal });
        if (!controller.signal.aborted) setConversations(response.data.conversations ?? []);
      } catch (failure) {
        if (!controller.signal.aborted) setError(apiError(failure, "Could not load conversations."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return <>
    <div className="border-b border-gray-200 p-4">
      <h1 className="mb-3 text-xl font-bold">Conversations</h1>
      <form onSubmit={createConversation} className="flex flex-col gap-2">
        <label htmlFor="participant">Participant ID</label>
        <input id="participant" required value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="rounded border p-2" />
        <button disabled={creating || loading} className="rounded border p-2 disabled:opacity-50">{creating ? "Creating..." : "Create conversation"}</button>
        {createError && <p role="alert" className="text-sm text-red-700">{createError}</p>}
      </form>
      <button disabled={loading || creating} className="mt-3 text-sm underline disabled:opacity-50" onClick={() => { setLoading(true); setError(null); setAttempt((n) => n + 1); }}>Refresh list</button>
    </div>
    {loading ? <p role="status" className="p-5">Loading conversations…</p> : error ? <div className="space-y-3 p-5"><p role="alert" className="text-red-700">{error}</p><button className="rounded border px-3 py-2" onClick={() => { setLoading(true); setError(null); setAttempt((n) => n + 1); }}>Try again</button></div> : conversations.length === 0 ? <p className="p-5 text-slate-500">No conversations yet.</p> :
      <ul className="overflow-y-auto p-2">{conversations.map((conversation) => <li key={conversation.id}>
        <button onClick={() => onSelect(conversation)} aria-pressed={selectedId === conversation.id} className={`mb-1 w-full rounded p-3 text-left ${selectedId === conversation.id ? "bg-gray-200" : "hover:bg-gray-100"}`}>
          <span className="block truncate font-medium">{conversationTitle(conversation, userId)}</span>
          <span className="mt-1 block text-xs text-slate-500">{new Date(conversation.updatedAt).toLocaleString()}</span>
          {(conversation.participants ?? []).filter((id) => id !== userId).map((id) => <span key={id} className="block truncate text-xs text-gray-600">{presence[id] === undefined ? "Presence unknown" : presence[id] ? "Online" : "Offline"}</span>)}
        </button>
      </li>)}</ul>}
  </>;
}
