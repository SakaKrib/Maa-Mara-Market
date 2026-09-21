import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IonIcon } from "@ionic/react";
import { addOutline, arrowBackOutline, attachOutline, chatbubbleEllipsesOutline, closeOutline, peopleOutline, personOutline, sendOutline, storefrontOutline } from "ionicons/icons";
import { useAuth } from "../Auth/AuthContext/Context";
import api, { getWebSocketUrl, resolveApiAssetUrl } from "../../Services/Api";

const timeLabel = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

export default function Messaging() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin || user?.role === "admin" || user?.is_staff);
  const [contacts, setContacts] = useState({ admins: [], users: [], vendors: [] });
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("users");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [mobileThread, setMobileThread] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const selectedRef = useRef(null);
  const endRef = useRef(null);

  const loadContacts = useCallback(async () => {
    const response = await api.get("/api/messaging/contacts/");
    setContacts(response.data || {});
  }, []);

  const loadConversations = useCallback(async () => {
    const response = await api.get("/api/messaging/conversations/");
    setConversations(response.data?.results || []);
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    const response = await api.get("/api/messaging/conversations/" + id + "/messages/");
    setMessages(response.data?.results || []);
    api.post("/api/messaging/conversations/" + id + "/read/").then(() => {
      setConversations((current) => current.map((conversation) => (
        conversation.id === id ? { ...conversation, unread_count: 0 } : conversation
      )));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([loadContacts(), loadConversations()]).catch((err) => {
      setError(err?.response?.data?.error || "Unable to load messages.");
    });
  }, [loadContacts, loadConversations]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    let socket;
    let timer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/messaging/"));
      socketRef.current = socket;

      socket.onopen = () => {
        attempts = 0;
        if (selectedRef.current?.id) {
          socket.send(JSON.stringify({
            type: "join_conversation",
            conversation_id: selectedRef.current.id,
          }));
        }
      };

      socket.onmessage = async (event) => {
        try {
          const incoming = JSON.parse(event.data);

          if (incoming.type === "message.created" && selectedRef.current?.id === incoming.conversation_id) {
            setMessages((current) => {
              if (current.some((message) => message.id === incoming.message_id)) {
                return current;
              }
              return [...current, incoming];
            });
            await loadConversations();
          } else if (incoming.type === "conversation.updated") {
            await loadConversations();
            if (selectedRef.current?.id === incoming.conversation_id) {
              await loadMessages(selectedRef.current.id);
            }
          } else if (incoming.type === "conversation.created") {
            await loadConversations();
          }
        } catch (_) {
          // Ignore malformed realtime frames and keep the connection alive.
        }
      };

      socket.onclose = (event) => {
        if (closed || event.code === 4401) return;
        timer = window.setTimeout(
          connect,
          Math.min(1000 * Math.pow(2, attempts++), 15000)
        );
      };

      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      if (socket) socket.close();
      socketRef.current = null;
    };
  }, [loadConversations, loadMessages]);
  useEffect(() => {
    if (selected?.id) {
      loadMessages(selected.id).catch(() => setError("Unable to load conversation."));
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "join_conversation", conversation_id: selected.id }));
      }
    } else {
      setMessages([]);
    }
  }, [selected?.id, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async (contact) => {
    try {
      setError("");
      const response = await api.post("/api/messaging/conversations/", { participant_id: contact.id });
      await loadConversations();
      setSelected(response.data);
      setMobileThread(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to start conversation.");
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selected || sending || (!body.trim() && !image)) return;
    const form = new FormData();
    if (body.trim()) form.append("body", body.trim());
    if (image) form.append("image", image);
    setSending(true);
    try {
      await api.post("/api/messaging/conversations/" + selected.id + "/messages/", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setBody("");
      setImage(null);
      setPreview("");
      await loadMessages(selected.id);
      await loadConversations();
    } catch (err) {
      setError(err?.response?.data?.error || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conversation) => {
    setSelected(conversation);
    setMobileThread(true);
    setError("");
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Select an image of 5 MB or less.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const activeContacts = useMemo(() => {
    if (!isAdmin) return contacts.admins || [];
    return tab === "vendors" ? contacts.vendors || [] : contacts.users || [];
  }, [contacts, isAdmin, tab]);

  const other = (conversation) => isAdmin ? conversation.participant : conversation.admin;
  const nameOf = (conversation) => other(conversation)?.name || other(conversation)?.username || "Maa Mara Admin";

  return (
    <div className="min-h-screen bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-110px)] max-w-7xl overflow-hidden rounded-2xl border border-border bg-card shadow-custom">
        <aside className={(mobileThread ? "hidden lg:flex" : "flex") + " w-full shrink-0 flex-col border-r border-border lg:w-[340px]"}>
          <div className="border-b border-border p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><IonIcon icon={chatbubbleEllipsesOutline} className="text-xl" /></div>
              <div><h1 className="text-lg font-bold text-card-foreground">Messages</h1><p className="text-xs text-muted-foreground">{isAdmin ? "Users and vendors" : "Chat with Maa Mara Admin"}</p></div>
            </div>
            {isAdmin ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTab("users")} className={"rounded-xl px-3 py-2 text-xs font-bold " + (tab === "users" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>Users</button>
                <button type="button" onClick={() => setTab("vendors")} className={"rounded-xl px-3 py-2 text-xs font-bold " + (tab === "vendors" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>Vendors</button>
              </div>
            ) : (
              <button type="button" onClick={() => contacts.admins?.[0] && startConversation(contacts.admins[0])} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><IonIcon icon={addOutline} /> Start a chat with Admin</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
              <button key={conversation.id} type="button" onClick={() => selectConversation(conversation)} className={"flex w-full gap-3 border-b border-border p-3 text-left hover:bg-muted " + (selected?.id === conversation.id ? "bg-muted" : "")}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><IonIcon icon={isAdmin && other(conversation)?.is_vendor ? storefrontOutline : peopleOutline} /></div>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-semibold text-card-foreground">{nameOf(conversation)}</p>{conversation.unread_count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{conversation.unread_count}</span>}</div><p className="truncate text-xs text-muted-foreground">{conversation.last_message?.body || (conversation.last_message?.image ? "Image" : "No messages yet")}</p></div>
              </button>
            ))}

            <div className="border-t border-border p-3">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isAdmin ? "Start new chat" : "Available admin"}</p>
              {activeContacts.map((contact) => (
                <button key={contact.id} type="button" onClick={() => startConversation(contact)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><IonIcon icon={contact.is_vendor ? storefrontOutline : personOutline} /></div>
                  <div className="min-w-0"><p className="truncate text-xs font-semibold text-card-foreground">{contact.name}</p><p className="truncate text-[10px] text-muted-foreground">{contact.email}</p></div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className={(mobileThread ? "flex" : "hidden lg:flex") + " min-w-0 flex-1 flex-col"}>
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-border p-3">
                <button type="button" onClick={() => setMobileThread(false)} className="rounded-lg p-2 hover:bg-muted lg:hidden"><IonIcon icon={arrowBackOutline} /></button>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><IonIcon icon={chatbubbleEllipsesOutline} /></div>
                <div><h2 className="text-sm font-bold text-card-foreground">{nameOf(selected)}</h2><p className="text-[11px] text-muted-foreground">Live conversation</p></div>
              </header>
              <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-5">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id;
                  return <div key={message.id} className={"mb-3 flex " + (mine ? "justify-end" : "justify-start")}><div className={"max-w-[82%] rounded-2xl px-3 py-2 " + (mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-card-foreground")}>{message.image && <img src={resolveApiAssetUrl(message.image)} alt="Attachment" className="mb-2 max-h-72 max-w-full rounded-xl object-contain" />}{message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}<p className="mt-1 text-[9px] opacity-70">{timeLabel(message.created_at)}</p></div></div>;
                })}
                <div ref={endRef} />
              </div>
              {error && <div className="bg-red-500/10 px-4 py-2 text-xs text-red-600">{error}</div>}
              {preview && <div className="border-t border-border p-2"><div className="relative inline-block"><img src={preview} alt="Preview" className="h-20 rounded-xl" /><button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setImage(null); setPreview(""); }} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow"><IonIcon icon={closeOutline} /></button></div></div>}
              <form onSubmit={sendMessage} className="border-t border-border p-3">
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground hover:bg-muted"><IonIcon icon={attachOutline} className="text-xl" /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={selectImage} /></label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1} placeholder="Write a message..." className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
                  <button type="submit" disabled={sending || (!body.trim() && !image)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"><IonIcon icon={sendOutline} /></button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><IonIcon icon={chatbubbleEllipsesOutline} className="text-3xl" /></div><h2 className="mt-4 text-lg font-bold text-card-foreground">Start a conversation</h2><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Choose a user or vendor." : "Start a conversation with the Maa Mara admin team."}</p></div>
          )}
        </main>
      </div>
    </div>
  );
}
