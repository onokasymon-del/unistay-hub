import h1 from "@/assets/hostel-1.jpg";
import h2 from "@/assets/hostel-2.jpg";
import h3 from "@/assets/hostel-3.jpg";
import h4 from "@/assets/hostel-4.jpg";
import h5 from "@/assets/hostel-5.jpg";
import h6 from "@/assets/hostel-6.jpg";

export type RoomType = "single" | "shared" | "ensuite";
export type Amenity = "wifi" | "water" | "security" | "electricity" | "laundry" | "parking" | "study";

export interface Hostel {
  id: string;
  name: string;
  images: string[];
  pricePerMonth: number;
  currency: string;
  location: string;
  institution: string;
  distanceKm: number;
  rating: number;
  reviewsCount: number;
  slotsLeft: number;
  totalSlots: number;
  roomTypes: RoomType[];
  amenities: Amenity[];
  description: string;
  rules: string[];
}

export const INSTITUTIONS = [
  "University of Nairobi",
  "Kenyatta University",
  "JKUAT",
  "Strathmore University",
  "Moi University",
  "Egerton University",
  "Maseno University",
  "Technical University of Kenya",
  "Multimedia University of Kenya",
  "USIU-Africa",
];

export const HOSTELS: Hostel[] = [
  {
    id: "kahawa-heights",
    name: "Kahawa Heights",
    images: [h3, h1, h4, h6],
    pricePerMonth: 6500,
    currency: "KES",
    location: "Kahawa Sukari, Nairobi",
    institution: "Kenyatta University",
    distanceKm: 0.6,
    rating: 4.6,
    reviewsCount: 128,
    slotsLeft: 4,
    totalSlots: 32,
    roomTypes: ["single", "shared"],
    amenities: ["wifi", "water", "security", "electricity", "laundry", "study"],
    description:
      "Modern student apartments a short walk from KU's main gate. Spacious rooms, reliable water and 24/7 security.",
    rules: ["No smoking indoors", "Visitors leave by 10 PM", "Quiet hours after 11 PM"],
  },
  {
    id: "juja-greens",
    name: "Juja Greens Hostel",
    images: [h6, h2, h1, h3],
    pricePerMonth: 4800,
    currency: "KES",
    location: "Juja, Kiambu",
    institution: "JKUAT",
    distanceKm: 0.4,
    rating: 4.3,
    reviewsCount: 86,
    slotsLeft: 9,
    totalSlots: 48,
    roomTypes: ["shared"],
    amenities: ["wifi", "water", "security", "electricity"],
    description:
      "Affordable and friendly community hostel with a green courtyard. Walking distance to JKUAT main campus.",
    rules: ["Lock the gate after 9 PM", "Keep common areas clean"],
  },
  {
    id: "madaraka-suites",
    name: "Madaraka Student Suites",
    images: [h5, h1, h4, h3],
    pricePerMonth: 9800,
    currency: "KES",
    location: "Madaraka, Nairobi",
    institution: "Strathmore University",
    distanceKm: 0.3,
    rating: 4.8,
    reviewsCount: 211,
    slotsLeft: 2,
    totalSlots: 24,
    roomTypes: ["ensuite", "single"],
    amenities: ["wifi", "water", "security", "electricity", "laundry", "parking", "study"],
    description:
      "Premium ensuite rooms with private bathrooms, fast Wi-Fi and 24/7 backup power. A favourite among Strathmore students.",
    rules: ["No parties", "Respect quiet study hours"],
  },
  {
    id: "uon-towers",
    name: "UoN Riverside Towers",
    images: [h4, h2, h6, h1],
    pricePerMonth: 7200,
    currency: "KES",
    location: "Riverside, Nairobi",
    institution: "University of Nairobi",
    distanceKm: 1.2,
    rating: 4.4,
    reviewsCount: 152,
    slotsLeft: 6,
    totalSlots: 60,
    roomTypes: ["single", "shared"],
    amenities: ["wifi", "water", "security", "electricity", "study"],
    description:
      "Bright single and shared rooms with study lounges on every floor. Matatus to UoN main campus right outside.",
    rules: ["No loud music after 10 PM"],
  },
  {
    id: "roysambu-stay",
    name: "Roysambu Student Stay",
    images: [h2, h6, h3, h1],
    pricePerMonth: 5200,
    currency: "KES",
    location: "Roysambu, Nairobi",
    institution: "USIU-Africa",
    distanceKm: 0.9,
    rating: 4.1,
    reviewsCount: 64,
    slotsLeft: 11,
    totalSlots: 40,
    roomTypes: ["shared"],
    amenities: ["wifi", "water", "security", "electricity", "laundry"],
    description:
      "Lively shared rooms close to USIU. Affordable, vibrant, and great for first-year students.",
    rules: ["Visitors sign in at gate"],
  },
  {
    id: "ruiru-haven",
    name: "Ruiru Haven Hostel",
    images: [h1, h4, h5, h6],
    pricePerMonth: 5800,
    currency: "KES",
    location: "Ruiru, Kiambu",
    institution: "Kenyatta University",
    distanceKm: 2.1,
    rating: 4.2,
    reviewsCount: 73,
    slotsLeft: 0,
    totalSlots: 36,
    roomTypes: ["single", "shared"],
    amenities: ["wifi", "water", "security", "electricity", "parking"],
    description:
      "Quiet, secure compound with a study room and ample parking. A short matatu ride to KU.",
    rules: ["Pay rent by the 5th"],
  },
];

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
