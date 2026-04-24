import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export async function listMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(bookingId: string, senderId: string, body: string): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty");
  if (trimmed.length > 2000) throw new Error("Message is too long (max 2000 characters)");
  const { data, error } = await supabase
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: senderId, body: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markMessagesRead(bookingId: string, viewerId: string): Promise<void> {
  // Mark all messages in this thread NOT sent by me as read
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .neq("sender_id", viewerId)
    .is("read_at", null);
  if (error) {
    // Non-fatal
    console.warn("markMessagesRead failed", error);
  }
}
