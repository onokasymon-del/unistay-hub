import { useState, type FormEvent } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AMENITY_LABELS,
  ROOM_TYPE_LABELS,
  type Amenity,
  type Hostel,
  type HostelInput,
  type RoomType,
  createHostel,
  deleteHostelImage,
  updateHostel,
  uploadHostelImage,
} from "@/lib/hostels-api";
import { INSTITUTIONS_BY_TYPE } from "@/data/institutions";

const ALL_INSTITUTIONS = [
  ...INSTITUTIONS_BY_TYPE.university,
  ...INSTITUTIONS_BY_TYPE.college,
  ...INSTITUTIONS_BY_TYPE.tti,
].sort();

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).default(""),
  location: z.string().trim().min(2).max(120),
  institution: z.string().trim().min(2).max(120),
  distance_km: z.number().min(0).max(50),
  price_per_month: z.number().int().min(500).max(500000),
  total_slots: z.number().int().min(1).max(500),
  room_types: z.array(z.enum(["single", "shared", "ensuite"])).min(1, "Pick at least one room type"),
  amenities: z.array(z.enum(["wifi", "water", "security", "electricity", "laundry", "parking", "study"])),
  rules: z.array(z.string()).default([]),
  is_published: z.boolean(),
});

interface Props {
  ownerId: string;
  hostel?: Hostel | null;
  canPublish: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function HostelForm({ ownerId, hostel, canPublish, onSaved, onCancel }: Props) {
  const isEdit = !!hostel;
  const [form, setForm] = useState<HostelInput>({
    name: hostel?.name ?? "",
    description: hostel?.description ?? "",
    location: hostel?.location ?? "",
    institution: hostel?.institution ?? "",
    distance_km: hostel?.distance_km ?? 1,
    price_per_month: hostel?.price_per_month ?? 8000,
    total_slots: hostel?.total_slots ?? 10,
    room_types: hostel?.room_types ?? ["single"],
    amenities: hostel?.amenities ?? ["wifi", "water"],
    rules: hostel?.rules ?? [],
    is_published: hostel?.is_published ?? false,
  });
  const [rulesText, setRulesText] = useState((hostel?.rules ?? []).join("\n"));
  const [images, setImages] = useState<string[]>(hostel?.images ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof HostelInput>(k: K, v: HostelInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!hostel) {
      toast.error("Save the hostel first, then upload images.");
      return;
    }
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Up to ${MAX_IMAGES} images per hostel.`);
      return;
    }
    setUploading(true);
    try {
      let pos = images.length;
      const uploaded: string[] = [];
      for (const f of files) {
        if (f.size > MAX_BYTES) {
          toast.error(`${f.name} is over 5MB`);
          continue;
        }
        const url = await uploadHostelImage(hostel.id, f, pos++);
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    if (!hostel) return;
    try {
      await deleteHostelImage(hostel.id, url);
      setImages((prev) => prev.filter((u) => u !== url));
    } catch (err: any) {
      toast.error(err?.message ?? "Could not remove image");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: HostelInput = {
      ...form,
      rules: rulesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (payload.is_published && !canPublish) {
      toast.error("You must be verified before publishing a hostel.");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && hostel) {
        await updateHostel(hostel.id, payload);
        toast.success("Hostel updated");
      } else {
        await createHostel(ownerId, payload);
        toast.success("Hostel created. Add images next.");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save hostel");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hostel name">
          <input className={input} required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Nearest institution">
          <select required className={input} value={form.institution} onChange={(e) => update("institution", e.target.value)}>
            <option value="">Select…</option>
            {ALL_INSTITUTIONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Location / area">
          <input className={input} required value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Roysambu, Nairobi" />
        </Field>
        <Field label="Distance from campus (km)">
          <input type="number" min={0} step={0.1} className={input} required value={form.distance_km} onChange={(e) => update("distance_km", Number(e.target.value))} />
        </Field>
        <Field label="Price per month (KES)">
          <input type="number" min={500} step={100} className={input} required value={form.price_per_month} onChange={(e) => update("price_per_month", Number(e.target.value))} />
        </Field>
        <Field label="Total rooms / slots">
          <input type="number" min={1} className={input} required value={form.total_slots} onChange={(e) => update("total_slots", Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={4}
          className={`${input} h-auto py-2`}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Tell students what makes your place great…"
        />
      </Field>

      <div>
        <p className="text-sm font-medium mb-2">Room types</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((rt) => (
            <Chip key={rt} active={form.room_types.includes(rt)} onClick={() => update("room_types", toggleArr(form.room_types, rt))}>
              {ROOM_TYPE_LABELS[rt]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Amenities</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AMENITY_LABELS) as Amenity[]).map((a) => (
            <Chip key={a} active={form.amenities.includes(a)} onClick={() => update("amenities", toggleArr(form.amenities, a))}>
              {AMENITY_LABELS[a]}
            </Chip>
          ))}
        </div>
      </div>

      <Field label="House rules (one per line)">
        <textarea
          rows={3}
          className={`${input} h-auto py-2`}
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          placeholder={"No smoking\nQuiet hours after 10pm"}
        />
      </Field>

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Photos ({images.length}/{MAX_IMAGES})</p>
          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-border px-3 h-8 text-xs font-semibold hover:bg-muted">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Add photos
            <input type="file" accept="image/*" multiple hidden onChange={handleFiles} disabled={uploading || !isEdit} />
          </label>
        </div>
        {!isEdit && (
          <p className="text-xs text-muted-foreground mb-2">Save the hostel first to enable photo uploads.</p>
        )}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative group aspect-[4/3] overflow-hidden rounded-xl border border-border">
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1 right-1 grid place-items-center h-7 w-7 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-foreground text-background text-[10px] font-semibold px-2 py-0.5">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No photos yet. The first photo becomes the cover image.
          </div>
        )}
      </div>

      {/* Publish */}
      <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={form.is_published}
          onChange={(e) => update("is_published", e.target.checked)}
          disabled={!canPublish}
        />
        <span>
          <span className="font-medium">Publish this hostel</span>
          <span className="block text-xs text-muted-foreground">
            {canPublish
              ? "When checked, students can find and book this hostel."
              : "You must complete landlord verification before publishing."}
          </span>
        </span>
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-full border border-border px-5 text-sm font-semibold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save changes" : "Create hostel"}
        </button>
      </div>
    </form>
  );
}

const input =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 h-9 text-xs font-semibold transition ${
        active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

// kept for tree-shaking warning silence
export const _Trash = Trash2;
