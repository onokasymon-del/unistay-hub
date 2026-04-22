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
