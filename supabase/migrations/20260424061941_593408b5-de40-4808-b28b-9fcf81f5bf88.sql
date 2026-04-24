-- =========================================================
-- Phase 5: Messages + Notifications
-- =========================================================

-- ---------------- Messages ----------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_booking_created on public.messages(booking_id, created_at);
create index idx_messages_sender on public.messages(sender_id);

alter table public.messages enable row level security;

-- Helper: who are the two participants for a booking?
create or replace function public.is_booking_participant(_booking_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.bookings b
    join public.hostels h on h.id = b.hostel_id
    where b.id = _booking_id
      and (b.student_id = _user_id or h.owner_id = _user_id)
  );
$$;

create policy "Participants view booking messages"
  on public.messages for select
  to authenticated
  using (public.is_booking_participant(booking_id, auth.uid()));

create policy "Participants send booking messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_booking_participant(booking_id, auth.uid())
  );

create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (public.is_booking_participant(booking_id, auth.uid()) and sender_id <> auth.uid())
  with check (public.is_booking_participant(booking_id, auth.uid()) and sender_id <> auth.uid());

-- Realtime
alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

-- ---------------- Notifications ----------------
create type public.notification_type as enum (
  'booking_requested',
  'booking_approved',
  'booking_rejected',
  'message_received',
  'verification_approved',
  'verification_rejected'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index idx_notifications_user_unread on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Users view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Inserts come from triggers (security definer), no client insert policy needed.

alter publication supabase_realtime add table public.notifications;
alter table public.notifications replica identity full;

-- ---------------- Trigger: booking events ----------------
create or replace function public.notify_on_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _hostel record;
  _student_name text;
begin
  select h.id, h.name, h.owner_id, h.slug into _hostel
  from public.hostels h where h.id = coalesce(new.hostel_id, old.hostel_id);

  if (tg_op = 'INSERT') then
    select full_name into _student_name from public.profiles where id = new.student_id;
    -- notify landlord
    insert into public.notifications(user_id, type, title, body, link, data)
    values (
      _hostel.owner_id,
      'booking_requested',
      'New booking request',
      coalesce(_student_name, 'A student') || ' requested ' || _hostel.name,
      '/dashboard',
      jsonb_build_object('booking_id', new.id, 'hostel_id', _hostel.id)
    );
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if (old.status is distinct from new.status) then
      if new.status = 'approved' then
        insert into public.notifications(user_id, type, title, body, link, data)
        values (
          new.student_id,
          'booking_approved',
          'Booking approved 🎉',
          'Your request for ' || _hostel.name || ' was approved.',
          '/dashboard',
          jsonb_build_object('booking_id', new.id, 'hostel_id', _hostel.id)
        );
      elsif new.status = 'rejected' then
        insert into public.notifications(user_id, type, title, body, link, data)
        values (
          new.student_id,
          'booking_rejected',
          'Booking declined',
          'Your request for ' || _hostel.name || ' was declined.',
          '/dashboard',
          jsonb_build_object('booking_id', new.id, 'hostel_id', _hostel.id)
        );
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_notify_booking
after insert or update on public.bookings
for each row execute function public.notify_on_booking_change();

-- ---------------- Trigger: new messages ----------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _b record;
  _recipient uuid;
  _sender_name text;
  _hostel_name text;
begin
  select b.id, b.student_id, b.hostel_id, h.owner_id, h.name as hostel_name
    into _b
  from public.bookings b
  join public.hostels h on h.id = b.hostel_id
  where b.id = new.booking_id;

  if new.sender_id = _b.student_id then
    _recipient := _b.owner_id;
  else
    _recipient := _b.student_id;
  end if;

  select full_name into _sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications(user_id, type, title, body, link, data)
  values (
    _recipient,
    'message_received',
    'New message from ' || coalesce(_sender_name, 'someone'),
    left(new.body, 140),
    '/dashboard',
    jsonb_build_object('booking_id', new.booking_id, 'hostel_id', _b.hostel_id)
  );
  return new;
end;
$$;

create trigger trg_notify_message
after insert on public.messages
for each row execute function public.notify_on_message();

-- ---------------- Trigger: verification decisions ----------------
create or replace function public.notify_on_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status) then
    if new.status = 'approved' then
      insert into public.notifications(user_id, type, title, body, link)
      values (new.landlord_id, 'verification_approved',
        'Verification approved',
        'Your landlord account is verified. You can now publish hostels.',
        '/dashboard');
    elsif new.status = 'rejected' then
      insert into public.notifications(user_id, type, title, body, link)
      values (new.landlord_id, 'verification_rejected',
        'Verification rejected',
        coalesce(new.admin_notes, 'Please review your documents and resubmit.'),
        '/dashboard');
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_notify_verification
after update on public.landlord_verifications
for each row execute function public.notify_on_verification();

-- ---------------- updated_at not needed; messages/notifications are append-only ----------------
