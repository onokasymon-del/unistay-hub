import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/auth-context";
import { createBooking, ROOM_TYPE_LABELS, type Hostel, type RoomType } from "@/lib/hostels-api";
import { formatPrice } from "@/lib/format";

interface Props {
  hostel: Hostel;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function BookingDialog({ hostel, open, onClose, onCreated }: Props) {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [roomType, setRoomType] = useState<RoomType>(hostel.room_types[0] ?? "shared");
  const [moveInDate, setMoveInDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [months, setMonths] = useState<number>(3);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const total = hostel.price_per_month * months;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      onClose();
      navigate({ to: "/login", search: { redirect: `/hostel/${hostel.slug ?? hostel.id}` } });
      return;
    }
    if (profile?.role !== "student") {
      toast.error("Only student accounts can request bookings.");
      return;
    }
    setSubmitting(true);
    try {
      await createBooking(user.id, {
        hostel_id: hostel.id,
        room_type: roomType,
        move_in_date: moveInDate,
        months,
        message: message.trim() || undefined,
      });
      toast.success("Booking request sent! The landlord will review it shortly.");
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send booking request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-foreground/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold">Request booking</h2>
            <p className="text-xs text-muted-foreground">{hostel.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          <div>
            <label className="text-sm font-semibold">Room type</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {hostel.room_types.map((rt) => (
                <button
                  type="button"
                  key={rt}
                  onClick={() => setRoomType(rt)}
                  className={`h-10 rounded-full px-4 text-sm font-medium border transition ${
                    roomType === rt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  {ROOM_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold">Move-in date</span>
              <input
                type="date"
                required
                value={moveInDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Months</span>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4, 6, 9, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? "month" : "months"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Message to landlord (optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Anything they should know about your move-in?"
              className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </label>

          <div className="rounded-xl bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold">{formatPrice(total, hostel.currency)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You won't be charged yet. The landlord must approve first.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send booking request"}
          </button>
        </form>
      </div>
    </div>
  );
}
