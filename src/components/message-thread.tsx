import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMessages, markMessagesRead, sendMessage, type Message } from "@/lib/messages-api";

interface Props {
  bookingId: string;
  viewerId: string;
  counterpartName: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function MessageThread({ bookingId, viewerId, counterpartName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMessages(bookingId)
      .then((m) => {
        if (cancelled) return;
        setMessages(m);
        markMessagesRead(bookingId, viewerId);
      })
      .catch((err) => toast.error(err?.message ?? "Couldn't load messages"))
      .finally(() => !cancelled && setLoading(false));

    const channel = supabase
      .channel(`messages-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id !== viewerId) {
            markMessagesRead(bookingId, viewerId);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId, viewerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const sent = await sendMessage(bookingId, viewerId, body);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setBody("");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-bold">Chat with {counterpartName}</div>
          <div className="text-[11px] text-muted-foreground">Messages are private to this booking</div>
        </div>
      </header>

      <div ref={scrollRef} className="max-h-[420px] min-h-[260px] overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10">
            No messages yet. Say hello to {counterpartName.split(" ")[0]} 👋
          </div>
        ) : (
          messages.map((m) => {
            const day = formatDay(m.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.sender_id === viewerId;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
                    {day}
                  </div>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <div
                      className={`mt-1 text-[10px] ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message…"
          rows={1}
          maxLength={2000}
          className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-cta)] disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
