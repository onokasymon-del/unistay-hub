import { useState, type FormEvent } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createReview } from "@/lib/hostels-api";

interface Props {
  hostelId: string;
  studentId: string;
  onCreated?: () => void;
}

export function ReviewForm({ hostelId, studentId, onCreated }: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 5) {
      toast.error("Please write a few words about your stay");
      return;
    }
    setSubmitting(true);
    try {
      await createReview(studentId, hostelId, rating, comment.trim());
      toast.success("Thanks for your review!");
      setComment("");
      setRating(5);
      onCreated?.();
    } catch (err: any) {
      const msg = err?.message ?? "Could not submit review";
      toast.error(msg.includes("duplicate") ? "You've already reviewed this hostel" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  const display = hover || rating;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Write a review</h3>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`Rate ${n} stars`}
          >
            <Star className={`h-6 w-6 ${n <= display ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold">{rating}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Share what students should know about this hostel"
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
      </button>
    </form>
  );
}
