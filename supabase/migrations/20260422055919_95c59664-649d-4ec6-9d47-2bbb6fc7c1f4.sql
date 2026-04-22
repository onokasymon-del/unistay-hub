-- enums
create type public.room_type as enum ('single', 'shared', 'ensuite');
create type public.amenity as enum ('wifi','water','security','electricity','laundry','parking','study');
create type public.booking_status as enum ('pending','approved','rejected','cancelled');

-- hostels
create table public.hostels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  slug text unique,
  name text not null,
  description text not null default '',
  location text not null,
  institution text not null,
  distance_km numeric(5,2) not null default 0,
  price_per_month integer not null,
  currency text not null default 'KES',
  total_slots integer not null default 0,
  slots_left integer not null default 0,
  rating numeric(3,2) not null default 0,
  reviews_count integer not null default 0,
  room_types public.room_type[] not null default '{}',
  amenities public.amenity[] not null default '{}',
  rules text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hostels_institution_idx on public.hostels (institution);
create index hostels_owner_idx on public.hostels (owner_id);
create index hostels_published_idx on public.hostels (is_published);

-- hostel images
create table public.hostel_images (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index hostel_images_hostel_idx on public.hostel_images (hostel_id, position);

-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  student_id uuid not null,
  room_type public.room_type not null,
  move_in_date date not null,
  months integer not null default 1 check (months between 1 and 12),
  message text,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_student_idx on public.bookings (student_id);
create index bookings_hostel_idx on public.bookings (hostel_id);
create index bookings_status_idx on public.bookings (status);

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  student_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostel_id, student_id)
);
create index reviews_hostel_idx on public.reviews (hostel_id);

-- wishlist
create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  unique (hostel_id, student_id)
);
create index wishlist_student_idx on public.wishlist (student_id);

-- updated_at triggers (set_updated_at already exists)
create trigger trg_hostels_updated_at before update on public.hostels
for each row execute function public.set_updated_at();
create trigger trg_bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
create trigger trg_reviews_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

-- helper: check if a student has an approved booking for a hostel
create or replace function public.has_approved_booking(_student_id uuid, _hostel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.bookings
    where student_id = _student_id
      and hostel_id = _hostel_id
      and status = 'approved'
  )
$$;

-- helper: refresh hostel rating + reviews_count after a review change
create or replace function public.refresh_hostel_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _hostel uuid := coalesce(new.hostel_id, old.hostel_id);
  _avg numeric;
  _cnt integer;
begin
  select coalesce(avg(rating),0)::numeric(3,2), count(*)
    into _avg, _cnt
  from public.reviews where hostel_id = _hostel;
  update public.hostels set rating = _avg, reviews_count = _cnt where id = _hostel;
  return null;
end;
$$;
create trigger trg_reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_hostel_rating();

-- slot management on booking status change
create or replace function public.handle_booking_slot_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.status = 'approved' then
      update public.hostels set slots_left = greatest(slots_left - 1, 0)
      where id = new.hostel_id;
    end if;
    return new;
  end if;
  if (tg_op = 'UPDATE') then
    if old.status <> 'approved' and new.status = 'approved' then
      update public.hostels set slots_left = greatest(slots_left - 1, 0)
      where id = new.hostel_id;
    elsif old.status = 'approved' and new.status <> 'approved' then
      update public.hostels set slots_left = slots_left + 1
      where id = new.hostel_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;
create trigger trg_bookings_slot_change
after insert or update on public.bookings
for each row execute function public.handle_booking_slot_change();

-- RLS
alter table public.hostels enable row level security;
alter table public.hostel_images enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist enable row level security;

-- hostels policies (browse is public)
create policy "Anyone can view published hostels"
  on public.hostels for select
  using (is_published = true or owner_id = auth.uid());

create policy "Landlords can insert own hostels"
  on public.hostels for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role(auth.uid(),'landlord'));

create policy "Landlords can update own hostels"
  on public.hostels for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Landlords can delete own hostels"
  on public.hostels for delete to authenticated
  using (owner_id = auth.uid());

-- hostel_images policies
create policy "Anyone can view images of visible hostels"
  on public.hostel_images for select
  using (exists(
    select 1 from public.hostels h
    where h.id = hostel_id and (h.is_published = true or h.owner_id = auth.uid())
  ));

create policy "Owners manage hostel images"
  on public.hostel_images for all to authenticated
  using (exists(select 1 from public.hostels h where h.id = hostel_id and h.owner_id = auth.uid()))
  with check (exists(select 1 from public.hostels h where h.id = hostel_id and h.owner_id = auth.uid()));

-- bookings policies
create policy "Students can create own booking"
  on public.bookings for insert to authenticated
  with check (student_id = auth.uid() and public.has_role(auth.uid(),'student'));

create policy "Students view own bookings"
  on public.bookings for select to authenticated
  using (student_id = auth.uid()
         or exists(select 1 from public.hostels h where h.id = hostel_id and h.owner_id = auth.uid()));

create policy "Students can cancel own pending bookings"
  on public.bookings for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Landlords update bookings on own hostels"
  on public.bookings for update to authenticated
  using (exists(select 1 from public.hostels h where h.id = hostel_id and h.owner_id = auth.uid()))
  with check (exists(select 1 from public.hostels h where h.id = hostel_id and h.owner_id = auth.uid()));

-- reviews policies
create policy "Anyone can view reviews"
  on public.reviews for select using (true);

create policy "Students with approved booking can review"
  on public.reviews for insert to authenticated
  with check (student_id = auth.uid() and public.has_approved_booking(auth.uid(), hostel_id));

create policy "Students update own reviews"
  on public.reviews for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "Students delete own reviews"
  on public.reviews for delete to authenticated
  using (student_id = auth.uid());

-- wishlist policies
create policy "Students view own wishlist"
  on public.wishlist for select to authenticated
  using (student_id = auth.uid());

create policy "Students manage own wishlist"
  on public.wishlist for insert to authenticated
  with check (student_id = auth.uid());

create policy "Students remove own wishlist"
  on public.wishlist for delete to authenticated
  using (student_id = auth.uid());