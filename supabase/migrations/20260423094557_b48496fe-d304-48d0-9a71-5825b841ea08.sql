
-- =============================================
-- 1. Storage Buckets
-- =============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hostel-images', 'hostel-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- =============================================
-- 2. Profiles: is_verified for landlords
-- =============================================
alter table public.profiles add column if not exists is_verified boolean not null default false;

-- =============================================
-- 3. Verification status enum
-- =============================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('pending','approved','rejected');
  end if;
end$$;

-- =============================================
-- 4. Landlord verification submissions
-- =============================================
create table if not exists public.landlord_verifications (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null unique,
  id_document_path text not null,
  ownership_document_path text not null,
  status public.verification_status not null default 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landlord_verifications enable row level security;

drop trigger if exists landlord_verifications_set_updated_at on public.landlord_verifications;
create trigger landlord_verifications_set_updated_at
before update on public.landlord_verifications
for each row execute function public.set_updated_at();

create or replace function public.handle_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status) then
    if new.status = 'approved' then
      update public.profiles set is_verified = true where id = new.landlord_id;
    elsif new.status = 'rejected' then
      update public.profiles set is_verified = false where id = new.landlord_id;
      update public.hostels set is_published = false where owner_id = new.landlord_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists landlord_verifications_after_decision on public.landlord_verifications;
create trigger landlord_verifications_after_decision
after update on public.landlord_verifications
for each row execute function public.handle_verification_decision();

drop policy if exists "Landlords view own verification" on public.landlord_verifications;
create policy "Landlords view own verification"
  on public.landlord_verifications for select to authenticated
  using (landlord_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Landlords insert own verification" on public.landlord_verifications;
create policy "Landlords insert own verification"
  on public.landlord_verifications for insert to authenticated
  with check (landlord_id = auth.uid() and public.has_role(auth.uid(), 'landlord'));

drop policy if exists "Landlords update own pending verification" on public.landlord_verifications;
create policy "Landlords update own pending verification"
  on public.landlord_verifications for update to authenticated
  using (landlord_id = auth.uid() and status = 'pending')
  with check (landlord_id = auth.uid());

drop policy if exists "Admins update verification status" on public.landlord_verifications;
create policy "Admins update verification status"
  on public.landlord_verifications for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Admin RLS additions
-- =============================================
drop policy if exists "Admins view all hostels" on public.hostels;
create policy "Admins view all hostels"
  on public.hostels for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update any hostel" on public.hostels;
create policy "Admins update any hostel"
  on public.hostels for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete any hostel" on public.hostels;
create policy "Admins delete any hostel"
  on public.hostels for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins view all bookings" on public.bookings;
create policy "Admins view all bookings"
  on public.bookings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete any review" on public.reviews;
create policy "Admins delete any review"
  on public.reviews for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. Storage policies — hostel-images
-- =============================================
drop policy if exists "Hostel images are publicly viewable" on storage.objects;
create policy "Hostel images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'hostel-images');

drop policy if exists "Landlords upload to own hostel folder" on storage.objects;
create policy "Landlords upload to own hostel folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hostel-images'
    and exists (
      select 1 from public.hostels h
      where h.id::text = (storage.foldername(name))[1]
        and h.owner_id = auth.uid()
    )
  );

drop policy if exists "Landlords update own hostel images" on storage.objects;
create policy "Landlords update own hostel images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'hostel-images'
    and exists (
      select 1 from public.hostels h
      where h.id::text = (storage.foldername(name))[1]
        and h.owner_id = auth.uid()
    )
  );

drop policy if exists "Landlords delete own hostel images" on storage.objects;
create policy "Landlords delete own hostel images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'hostel-images'
    and exists (
      select 1 from public.hostels h
      where h.id::text = (storage.foldername(name))[1]
        and h.owner_id = auth.uid()
    )
  );

drop policy if exists "Admins manage hostel images" on storage.objects;
create policy "Admins manage hostel images"
  on storage.objects for all to authenticated
  using (bucket_id = 'hostel-images' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'hostel-images' and public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. Storage policies — verification-docs (private)
-- =============================================
drop policy if exists "Landlords view own verification docs" on storage.objects;
create policy "Landlords view own verification docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Landlords upload own verification docs" on storage.objects;
create policy "Landlords upload own verification docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Landlords replace own verification docs" on storage.objects;
create policy "Landlords replace own verification docs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Landlords delete own verification docs" on storage.objects;
create policy "Landlords delete own verification docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admins view all verification docs" on storage.objects;
create policy "Admins view all verification docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.has_role(auth.uid(), 'admin'));
