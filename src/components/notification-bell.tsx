import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { useNotifications } from "@/hooks/use-notifications";
import type { AppNotification, NotificationType } from "@/lib/notifications-api";

const TYPE_DOT: Record<NotificationType, string> = {
  booking_requested: "bg-accent",
  booking_approved: "bg-success",
  booking_rejected: "bg-destructive",
  message_received: "bg-primary",
  verification_approved: "bg-success",
  verification_rejected: "bg-destructive",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const { items, unreadCount, markOne, markAll } = useNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  function handleClick(n: AppNotification) {
    markOne(n.id);
    setOpen(false);
    if (n.link) {
      navigate({ to: n.link as "/" });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-border bg-popover shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-bold">Notifications</div>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="mx-auto h-6 w-6 mb-2 opacity-60" />
                You're all caught up.
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition hover:bg-muted/60 ${
                        n.read_at ? "" : "bg-accent/5"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[n.type]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                        {n.body && (
                          <span className="block text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
