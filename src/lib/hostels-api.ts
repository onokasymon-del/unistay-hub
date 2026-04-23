import { supabase } from "@/integrations/supabase/client";

export type RoomType = "single" | "shared" | "ensuite";
export type Amenity = "wifi" | "water" | "security" | "electricity" | "laundry" | "parking" | "study";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Hostel {
  id: string;
  owner_id: string;
  slug: string | null;
  name: string;
  description: string;
  location: string;
  institution: string;
  distance_km: number;
  price_per_month: number;
  currency: string;
  total_slots: number;
  slots_left: number;
  rating: number;
  reviews_count: number;
  room_types: RoomType[];
  amenities: Amenity[];
  rules: string[];
  is_published: boolean;
  images: string[];
}

export const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: "Wi-Fi",
  water: "Water",
  security: "24/7 Security",
  electricity: "Electricity",
  laundry: "Laundry",
  parking: "Parking",
  study: "Study Room",
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: "Single",
  shared: "Shared",
  ensuite: "Ensuite",
};

interface HostelRow {
  id: string;
  owner_id: string;
  slug: string | null;
  name: string;
  description: string;
  location: string;
  institution: string;
  distance_km: number | string;
  price_per_month: number;
  currency: string;
  total_slots: number;
  slots_left: number;
  rating: number | string;
  reviews_count: number;
  room_types: RoomType[];
  amenities: Amenity[];
  rules: string[];
  is_published: boolean;
  hostel_images: { url: string; position: number }[];
}

function mapHostel(r: HostelRow): Hostel {
  const images = [...(r.hostel_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => i.url);
  return {
    id: r.id,
    owner_id: r.owner_id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    location: r.location,
    institution: r.institution,
    distance_km: Number(r.distance_km),
    price_per_month: r.price_per_month,
    currency: r.currency,
    total_slots: r.total_slots,
    slots_left: r.slots_left,
    rating: Number(r.rating),
    reviews_count: r.reviews_count,
    room_types: r.room_types ?? [],
    amenities: r.amenities ?? [],
    rules: r.rules ?? [],
    is_published: r.is_published,
    images: images.length > 0 ? images : ["/hostels/hostel-1.jpg"],
  };
}

export async function listHostels(): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, hostel_images(url, position)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HostelRow[]).map(mapHostel);
}

export async function getHostelByIdOrSlug(idOrSlug: string): Promise<Hostel | null> {
  // Try id first, then slug. We use 'or' for one round trip.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const query = supabase.from("hostels").select("*, hostel_images(url, position)");
  const { data, error } = isUuid
    ? await query.eq("id", idOrSlug).maybeSingle()
    : await query.eq("slug", idOrSlug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapHostel(data as HostelRow);
}

export async function listInstitutions(): Promise<string[]> {
  const { data, error } = await supabase.from("hostels").select("institution").eq("is_published", true);
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) set.add(row.institution as string);
  return Array.from(set).sort();
}

// ---------------- Bookings ----------------

export interface BookingInput {
  hostel_id: string;
  room_type: RoomType;
  move_in_date: string; // YYYY-MM-DD
  months: number;
  message?: string;
}

export interface Booking {
  id: string;
  hostel_id: string;
  student_id: string;
  room_type: RoomType;
  move_in_date: string;
  months: number;
  message: string | null;
  status: BookingStatus;
  created_at: string;
}

export async function createBooking(studentId: string, input: BookingInput): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({ ...input, student_id: studentId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Booking;
}

export interface BookingWithHostel extends Booking {
  hostel: Pick<Hostel, "id" | "slug" | "name" | "location" | "institution" | "price_per_month" | "currency"> & {
    images: string[];
  };
}

export async function listMyBookings(studentId: string): Promise<BookingWithHostel[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, hostel:hostels(id, slug, name, location, institution, price_per_month, currency, hostel_images(url, position))")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    ...b,
    hostel: {
      ...b.hostel,
      images: [...(b.hostel?.hostel_images ?? [])]
        .sort((a: any, z: any) => a.position - z.position)
        .map((i: any) => i.url),
    },
  })) as BookingWithHostel[];
}

export interface IncomingBooking extends Booking {
  hostel: { id: string; name: string };
  student: { id: string; full_name: string; phone: string | null };
}

export async function listIncomingBookings(landlordId: string): Promise<IncomingBooking[]> {
  // RLS lets landlords see bookings on their hostels via the join; constrain via ownership through hostel
  const { data: hostels } = await supabase.from("hostels").select("id, name").eq("owner_id", landlordId);
  const ids = (hostels ?? []).map((h) => h.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*, hostel:hostels(id, name)")
    .in("hostel_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // fetch student profiles
  const studentIds = Array.from(new Set((data ?? []).map((b: any) => b.student_id)));
  let profiles: Record<string, { id: string; full_name: string; phone: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: pr } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", studentIds);
    for (const p of pr ?? []) profiles[p.id] = p as any;
  }
  return (data ?? []).map((b: any) => ({
    ...b,
    student: profiles[b.student_id] ?? { id: b.student_id, full_name: "Student", phone: null },
  })) as IncomingBooking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------- Reviews ----------------

export interface Review {
  id: string;
  hostel_id: string;
  student_id: string;
  rating: number;
  comment: string;
  created_at: string;
  author?: { full_name: string };
}

export async function listReviews(hostelId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("hostel_id", hostelId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Review[];
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.student_id)));
  const { data: pr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const map: Record<string, { full_name: string }> = {};
  for (const p of pr ?? []) map[p.id] = { full_name: (p as any).full_name };
  return rows.map((r) => ({ ...r, author: map[r.student_id] ?? { full_name: "Student" } }));
}

export async function createReview(studentId: string, hostelId: string, rating: number, comment: string) {
  const { error } = await supabase.from("reviews").insert({
    student_id: studentId,
    hostel_id: hostelId,
    rating,
    comment,
  });
  if (error) throw error;
}

// ---------------- Wishlist ----------------

export async function listWishlistIds(studentId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("wishlist").select("hostel_id").eq("student_id", studentId);
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.hostel_id));
}

export async function addToWishlist(studentId: string, hostelId: string) {
  const { error } = await supabase.from("wishlist").insert({ student_id: studentId, hostel_id: hostelId });
  if (error) throw error;
}

export async function removeFromWishlist(studentId: string, hostelId: string) {
  const { error } = await supabase
    .from("wishlist")
    .delete()
    .eq("student_id", studentId)
    .eq("hostel_id", hostelId);
  if (error) throw error;
}

export async function listWishlistedHostels(studentId: string): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("wishlist")
    .select("hostel:hostels(*, hostel_images(url, position))")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => r.hostel)
    .filter(Boolean)
    .map((h: any) => mapHostel(h));
}

// ---------------- Landlord hostel CRUD ----------------

export interface HostelInput {
  name: string;
  description: string;
  location: string;
  institution: string;
  distance_km: number;
  price_per_month: number;
  total_slots: number;
  room_types: RoomType[];
  amenities: Amenity[];
  rules: string[];
  is_published: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function listMyHostels(ownerId: string): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, hostel_images(url, position)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HostelRow[]).map(mapHostel);
}

export async function createHostel(ownerId: string, input: HostelInput): Promise<Hostel> {
  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("hostels")
    .insert({
      ...input,
      owner_id: ownerId,
      slug,
      slots_left: input.total_slots,
    })
    .select("*, hostel_images(url, position)")
    .single();
  if (error) throw error;
  return mapHostel(data as HostelRow);
}

export async function updateHostel(id: string, input: Partial<HostelInput>): Promise<void> {
  const { error } = await supabase.from("hostels").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteHostel(id: string): Promise<void> {
  // Best-effort: clean up images in storage first
  const { data: imgs } = await supabase.from("hostel_images").select("url").eq("hostel_id", id);
  const paths = (imgs ?? [])
    .map((i: any) => extractStoragePath(i.url, "hostel-images"))
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await supabase.storage.from("hostel-images").remove(paths);
  }
  const { error } = await supabase.from("hostels").delete().eq("id", id);
  if (error) throw error;
}

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function uploadHostelImage(hostelId: string, file: File, position: number): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${hostelId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("hostel-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("hostel-images").getPublicUrl(path);
  const { error: insErr } = await supabase
    .from("hostel_images")
    .insert({ hostel_id: hostelId, url: pub.publicUrl, position });
  if (insErr) throw insErr;
  return pub.publicUrl;
}

export async function deleteHostelImage(hostelId: string, url: string): Promise<void> {
  const path = extractStoragePath(url, "hostel-images");
  if (path) {
    await supabase.storage.from("hostel-images").remove([path]);
  }
  await supabase.from("hostel_images").delete().eq("hostel_id", hostelId).eq("url", url);
}

export async function listHostelImages(hostelId: string): Promise<{ url: string; position: number }[]> {
  const { data, error } = await supabase
    .from("hostel_images")
    .select("url, position")
    .eq("hostel_id", hostelId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { url: string; position: number }[];
}

// ---------------- Landlord verification ----------------

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface LandlordVerification {
  id: string;
  landlord_id: string;
  id_document_path: string;
  ownership_document_path: string;
  status: VerificationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function getMyVerification(landlordId: string): Promise<LandlordVerification | null> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .eq("landlord_id", landlordId)
    .maybeSingle();
  if (error) throw error;
  return (data as LandlordVerification | null) ?? null;
}

async function uploadVerificationDoc(landlordId: string, file: File, kind: "id" | "ownership") {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${landlordId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("verification-docs")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}

export async function submitVerification(
  landlordId: string,
  idDoc: File,
  ownershipDoc: File,
): Promise<void> {
  const idPath = await uploadVerificationDoc(landlordId, idDoc, "id");
  const ownershipPath = await uploadVerificationDoc(landlordId, ownershipDoc, "ownership");

  const existing = await getMyVerification(landlordId);
  if (existing) {
    const { error } = await supabase
      .from("landlord_verifications")
      .update({
        id_document_path: idPath,
        ownership_document_path: ownershipPath,
        status: "pending",
        admin_notes: null,
      })
      .eq("landlord_id", landlordId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("landlord_verifications").insert({
      landlord_id: landlordId,
      id_document_path: idPath,
      ownership_document_path: ownershipPath,
    });
    if (error) throw error;
  }
}

export async function getVerificationDocSignedUrl(path: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from("verification-docs")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------- Admin ----------------

export interface VerificationWithLandlord extends LandlordVerification {
  landlord: { id: string; full_name: string; phone: string | null; institution_name: string | null };
}

export async function adminListVerifications(): Promise<VerificationWithLandlord[]> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as LandlordVerification[];
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((r) => r.landlord_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, phone, institution_name")
    .in("id", ids);
  const map: Record<string, any> = {};
  for (const p of profs ?? []) map[p.id] = p;
  return rows.map((r) => ({
    ...r,
    landlord: map[r.landlord_id] ?? {
      id: r.landlord_id,
      full_name: "Unknown",
      phone: null,
      institution_name: null,
    },
  }));
}

export async function adminDecideVerification(
  verificationId: string,
  reviewerId: string,
  status: "approved" | "rejected",
  notes?: string,
): Promise<void> {
  const { error } = await supabase
    .from("landlord_verifications")
    .update({
      status,
      admin_notes: notes ?? null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);
  if (error) throw error;
}

export async function adminListAllHostels(): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, hostel_images(url, position)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HostelRow[]).map(mapHostel);
}

export async function adminSetHostelPublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from("hostels").update({ is_published: isPublished }).eq("id", id);
  if (error) throw error;
}

export async function adminListAllReviews(): Promise<(Review & { hostel_name: string })[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, hostel:hostels(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, hostel_name: r.hostel?.name ?? "—" }));
}

export async function adminDeleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}
