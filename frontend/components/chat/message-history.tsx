"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { apiError } from "@/lib/api-error";
import { getSocket } from "@/lib/socket";
import type { Message, MessagePage, SocketAck, TypingEvent, ReadEvent } from "@/lib/types";
import MessageInput from "./message-input";

const PAGE_SIZE = 30;

function mergeMessages(current: Message[], incoming: Message[]) {
  const unique = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export default function MessageHistory({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [joined, setJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const [liveAttempt, setLiveAttempt] = useState(0);
  const [receiptAttempt, setReceiptAttempt] = useState(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const scrollSnapshot = useRef<{ height: number; top: number } | null>(null);
  const followBottom = useRef(true);
  const newestId = useRef<string | null>(null);
  const acknowledgedReads = useRef(new Set<string>());
  const pendingReads = useRef(new Set<string>());
  const olderRequest = useRef<AbortController | null>(null);
  const endpoint = `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`;

  // MongoDB history always loads over HTTP before joining the live room.
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await api.get<MessagePage>(endpoint, { params: { limit: PAGE_SIZE }, signal: controller.signal });
        if (controller.signal.aborted) return;
        const page = data.messages ?? [];
        newestId.current = page.at(-1)?.id ?? null;
        setMessages(page);
        setCursor(page.length === PAGE_SIZE ? data.nextCursor || null : null);
      } catch (failure) {
        if (!controller.signal.aborted) setError(apiError(failure, "Could not load messages"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => { controller.abort(); olderRequest.current?.abort(); };
  }, [endpoint, attempt]);

  useEffect(() => {
    if (loading || error) return;
    const socket = getSocket();
    let active = true;
    let generation = 0;
    let recovery: AbortController | null = null;
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    function newMessage(message: Message) {
      if (message.conversationId !== conversationId) return;
      newestId.current = message.id;
      setMessages((current) => mergeMessages(current, [message]));
    }
    function typing(event: TypingEvent) {
      if (event.conversationId !== conversationId || event.userId === userId) return;
      const oldTimer = typingTimers.get(event.userId);
      if (oldTimer) clearTimeout(oldTimer);
      setTypingUsers((current) => current.includes(event.userId) ? current : [...current, event.userId]);
      typingTimers.set(event.userId, setTimeout(() => {
        typingTimers.delete(event.userId);
        setTypingUsers((current) => current.filter((id) => id !== event.userId));
      }, 3000));
    }
    function stoppedTyping(event: TypingEvent) {
      if (event.conversationId !== conversationId) return;
      clearTimeout(typingTimers.get(event.userId));
      typingTimers.delete(event.userId);
      setTypingUsers((current) => current.filter((id) => id !== event.userId));
    }
    function read(event: ReadEvent) {
      if (event.userId !== userId) setReadIds((current) => new Set(current).add(event.messageId));
    }
    async function joinAndCatchUp() {
      const version = ++generation;
      recovery?.abort();
      const controller = new AbortController();
      recovery = controller;
      const anchor = newestId.current;
      setJoined(false);
      setLiveError("");
      try {
        const ack: SocketAck = await socket.timeout(10000).emitWithAck("join_conversation", { conversationId });
        if (!active || version !== generation) return;
        if (!ack?.success) throw new Error(ack?.message || "Could not join conversation");

        // Close the HTTP-to-room gap and recover missed messages on reconnect.
        // Page backwards until the last known message is encountered.
        // Capped so a missing/deleted anchor can't page through entire history.
        const MAX_RECOVERY_PAGES = 10;
        let before: string | undefined;
        const recovered: Message[] = [];
        for (let page = 0; page < MAX_RECOVERY_PAGES && !controller.signal.aborted; page++) {
          const { data } = await api.get<MessagePage>(endpoint, {
            params: { limit: PAGE_SIZE, ...(before ? { before } : {}) },
            signal: controller.signal,
          });
          const items = data.messages ?? [];
          recovered.push(...items);
          if (items.some((message) => message.id === anchor) || items.length < PAGE_SIZE ||
              !data.nextCursor || data.nextCursor === before) break;
          before = data.nextCursor;
        }
        if (!active || version !== generation || controller.signal.aborted) return;
        setMessages((current) => mergeMessages(current, recovered));
        // Live events may already have advanced newestId while HTTP was pending.
        if (newestId.current === anchor && recovered.length) newestId.current = recovered[recovered.length > PAGE_SIZE ? PAGE_SIZE - 1 : recovered.length - 1].id;
        setJoined(true);
      } catch (failure) {
        if (!active || version !== generation || controller.signal.aborted) return;
        setLiveError(failure instanceof Error ? failure.message : "Could not connect to conversation");
      }
    }
    function disconnected() {
      generation++;
      recovery?.abort();
      setJoined(false);
      setTypingUsers([]);
      for (const timer of typingTimers.values()) clearTimeout(timer);
      typingTimers.clear();
    }
    socket.on("new_message", newMessage);
    socket.on("user_typing", typing);
    socket.on("user_stopped_typing", stoppedTyping);
    socket.on("message_read", read);
    socket.on("connect", joinAndCatchUp);
    socket.on("disconnect", disconnected);
    if (socket.connected) void joinAndCatchUp();
    return () => {
      active = false;
      generation++;
      recovery?.abort();
      for (const timer of typingTimers.values()) clearTimeout(timer);
      socket.off("new_message", newMessage);
      socket.off("user_typing", typing);
      socket.off("user_stopped_typing", stoppedTyping);
      socket.off("message_read", read);
      socket.off("connect", joinAndCatchUp);
      socket.off("disconnect", disconnected);
      // No leave_conversation event exists. Filter all events by conversation ID.
    };
  }, [conversationId, userId, endpoint, loading, error, liveAttempt]);

  useLayoutEffect(() => {
    const area = scrollArea.current;
    if (!area) return;
    const snapshot = scrollSnapshot.current;
    if (snapshot) area.scrollTop = snapshot.top + area.scrollHeight - snapshot.height;
    else if (followBottom.current) area.scrollTop = area.scrollHeight;
    scrollSnapshot.current = null;
  }, [messages]);

  // Read only incoming bubbles actually intersecting the visible message panel.
  useEffect(() => {
    const area = scrollArea.current;
    if (!area || !joined) return;
    const socket = getSocket();
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== "visible" || !socket.connected) return;
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.messageId;
        if (!entry.isIntersecting || !id || acknowledgedReads.current.has(id) || pendingReads.current.has(id)) continue;
        pendingReads.current.add(id);
        socket.timeout(5000).emit("message_read", { messageId: id }, (failure: Error | null, ack?: SocketAck) => {
          pendingReads.current.delete(id);
          if (!failure && ack?.success) acknowledgedReads.current.add(id);
          else if (active) setReceiptError("Could not confirm read receipts.");
        });
      }
    }, { root: area, threshold: 0.1 });
    function observeVisible() {
      observer.disconnect();
      area?.querySelectorAll("[data-incoming]").forEach((element) => observer.observe(element));
    }
    observeVisible();
    document.addEventListener("visibilitychange", observeVisible);
    return () => { active = false; observer.disconnect(); document.removeEventListener("visibilitychange", observeVisible); };
  }, [messages, joined, receiptAttempt]);

  async function loadOlder() {
    if (!cursor || olderRequest.current) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const { data } = await api.get<MessagePage>(endpoint, { params: { limit: PAGE_SIZE, before: cursor }, signal: controller.signal });
      if (controller.signal.aborted) return;
      const page = data.messages ?? [];
      const area = scrollArea.current;
      if (area) scrollSnapshot.current = { height: area.scrollHeight, top: area.scrollTop };
      setMessages((current) => mergeMessages(current, page));
      setCursor(page.length === PAGE_SIZE && data.nextCursor !== cursor ? data.nextCursor || null : null);
    } catch (failure) {
      if (!controller.signal.aborted) setOlderError(apiError(failure, "Could not load older messages"));
    } finally {
      if (!controller.signal.aborted) { setLoadingOlder(false); olderRequest.current = null; }
    }
  }

  if (loading) return <p role="status" className="p-4">Loading messages...</p>;
  if (error) return <div className="space-y-3 p-4"><p role="alert" className="text-red-700">{error}</p><button className="rounded border px-3 py-2" onClick={() => { setLoading(true); setError(null); setAttempt((n) => n + 1); }}>Try again</button></div>;

  return <>
    {liveError && <p role="alert" className="p-3 text-sm text-red-700">{liveError} <button className="underline" onClick={() => { setLiveError(""); setLiveAttempt((n) => n + 1); }}>Retry connection</button></p>}
    {!joined && !liveError && <p role="status" className="px-4 py-2 text-sm">Waiting for live connection...</p>}
    <div ref={scrollArea} onScroll={() => {
      const area = scrollArea.current;
      if (area) followBottom.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
    }} className="min-h-0 flex-1 overflow-y-auto p-4" aria-label="Message history">
      {cursor && <div className="mb-4 text-center"><button disabled={loadingOlder} onClick={loadOlder} className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50">{loadingOlder ? "Loading..." : "Load older messages"}</button></div>}
      {olderError && <p role="alert" className="mb-3 text-red-700">{olderError}</p>}
      {messages.length === 0 ? <p className="py-8 text-center text-gray-500">No messages yet.</p> : <ol className="flex flex-col gap-3">{messages.map((message) => {
        const mine = message.senderId === userId;
        return <li key={message.id} data-message-id={message.id} data-incoming={mine ? undefined : "true"} className={`max-w-[85%] rounded border px-3 py-2 ${mine ? "self-end bg-gray-200" : "self-start bg-white"}`}>
          <p className="mb-1 break-all text-xs text-gray-600">{mine ? "You" : message.senderId}</p>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <time dateTime={message.createdAt} className="mt-1 block text-xs text-gray-600">{new Date(message.createdAt).toLocaleString()}</time>
          {mine && readIds.has(message.id) && <span className="text-xs">Read</span>}
        </li>;
      })}</ol>}
    </div>
    {receiptError && <p role="alert" className="px-4 text-sm text-red-700">{receiptError} <button className="underline" onClick={() => { setReceiptError(""); setReceiptAttempt((n) => n + 1); }}>Retry</button></p>}
    {typingUsers.length > 0 && <p role="status" className="px-4 py-1 text-sm text-gray-600">User is typing...</p>}
    <MessageInput conversationId={conversationId} ready={joined} />
  </>;
}
