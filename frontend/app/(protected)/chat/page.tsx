"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useProfile } from "@/components/protected-shell";
import ConversationList from "@/components/chat/conversation-list";
import MessageHistory from "@/components/chat/message-history";
import { conversationTitle, type Conversation } from "@/lib/types";

export default function ChatPage() {
  const profile = useProfile();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const socket = getSocket();
    const online = ({ userId }: { userId: string }) => setPresence((current) => ({ ...current, [userId]: true }));
    const offline = ({ userId }: { userId: string }) => setPresence((current) => ({ ...current, [userId]: false }));
    const connected = () => setStatus("Connected");
    const disconnected = () => { setStatus("Disconnected. Reconnecting..."); setPresence({}); };
    const failed = (error: Error) => setStatus(`Connection failed: ${error.message}`);
    socket.on("user_online", online);
    socket.on("user_offline", offline);
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", failed);
    if (socket.connected) queueMicrotask(connected);
    return () => {
      socket.off("user_online", online); socket.off("user_offline", offline);
      socket.off("connect", connected); socket.off("disconnect", disconnected); socket.off("connect_error", failed);
    };
  }, []);

  return <><div className="flex items-center gap-3 border-b bg-white px-4 py-2 text-sm"><span role="status">{status}</span>{status !== "Connected" && <button className="underline" onClick={() => getSocket().connect()}>Reconnect</button>}</div><main className="flex min-h-0 flex-1">
    <aside aria-label="Conversations" className={`${selected ? "hidden md:flex" : "flex"} w-full min-h-0 flex-col border-r border-slate-200 bg-white md:w-80 md:shrink-0`}>
      <ConversationList userId={profile.userId} selectedId={selected?.id} onSelect={setSelected} presence={presence} />
    </aside>
    <section aria-label="Conversation" className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
      {selected ? <>
        <header className="border-b border-slate-200 bg-white p-5">
          <button onClick={() => setSelected(null)} className="mb-3 text-sm text-indigo-600 md:hidden">← Conversations</button>
          <h2 className="break-all font-semibold">{conversationTitle(selected, profile.userId)}</h2>
          <p className="text-sm text-gray-600">{(selected.participants ?? []).filter((id) => id !== profile.userId).map((id) => presence[id] === undefined ? "Presence unknown" : presence[id] ? "Online" : "Offline").join(", ")}</p>
        </header>
        <MessageHistory key={selected.id} conversationId={selected.id} userId={profile.userId} />
      </> : <div className="m-auto p-8 text-center"><h2 className="text-2xl font-semibold">Your conversations</h2><p className="mt-2 text-slate-500">Select a conversation to view its message history.</p></div>}
    </section>
  </main></>;
}
