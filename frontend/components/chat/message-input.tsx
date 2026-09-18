"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSocket } from "@/lib/socket";
import type { SocketAck } from "@/lib/types";

export default function MessageInput({ conversationId, ready }: { conversationId: string; ready: boolean }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typing = useRef(false);
  const mounted = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const socket = getSocket();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (typing.current && socket.connected) socket.emit("typing_stop", { conversationId });
      typing.current = false;
    };
  }, [conversationId]);

  function stopTyping() {
    if (timer.current) clearTimeout(timer.current);
    if (typing.current && getSocket().connected) getSocket().emit("typing_stop", { conversationId });
    typing.current = false;
  }

  function change(value: string) {
    setContent(value);
    if (!value.trim()) { stopTyping(); return; }
    const socket = getSocket();
    if (!ready || !socket.connected) return;
    // Refresh the transient indicator while typing; receivers expire stale events.
    socket.emit("typing_start", { conversationId });
    typing.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(stopTyping, 1500);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const socket = getSocket();
    if (pending.current || !content.trim() || !ready || !socket.connected) return;
    pending.current = true;
    setSending(true);
    setError("");
    stopTyping();
    try {
      const result: SocketAck = await socket.timeout(10000).emitWithAck("send_message", { conversationId, content: content.trim() });
      if (!mounted.current) return;
      if (!result?.success) { setError(result?.message || "Message failed to send"); return; }
      // new_message owns insertion; acknowledgements only clear the input.
      setContent("");
    } catch {
      if (mounted.current) setError("No send confirmation. Check the history before retrying; the message may have been saved.");
    } finally {
      pending.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return <form onSubmit={send} className="space-y-2 border-t bg-white p-3">
    <label htmlFor="message" className="sr-only">Message</label>
    <div className="flex gap-2">
      <textarea id="message" rows={2} value={content} onChange={(e) => change(e.target.value)} onBlur={stopTyping} disabled={!ready || sending} placeholder={ready ? "Write a message..." : "Waiting for the conversation connection..."} className="flex-1 resize-none rounded border p-2 disabled:opacity-50" />
      <button disabled={!ready || sending || !content.trim()} className="rounded bg-gray-800 px-4 text-white disabled:opacity-50">{sending ? "Sending..." : "Send"}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>;
}
