-- Drop the restrictive policy
drop policy if exists "Authenticated Uploads" on storage.objects;

-- Create a new policy allowing public uploads (for development/local use)
create policy "Public Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'mapas-territorios' );

-- Ensure public access is still enabled
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'mapas-territorios' );
