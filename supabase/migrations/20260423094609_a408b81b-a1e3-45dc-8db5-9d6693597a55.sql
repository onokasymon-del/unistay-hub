
-- Restrict listing on hostel-images: only allow SELECT when the object path
-- is referenced in hostel_images (which is itself protected by RLS).
drop policy if exists "Hostel images are publicly viewable" on storage.objects;
create policy "Hostel images viewable when referenced"
  on storage.objects for select
  using (
    bucket_id = 'hostel-images'
    and exists (
      select 1 from public.hostel_images hi
      where hi.url like '%' || storage.objects.name
    )
  );
