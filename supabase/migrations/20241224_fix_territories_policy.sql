-- Drop the restrictive policy for territories
drop policy if exists "Enable insert for authenticated users only" on public.territorios;

-- Create a new policy allowing public inserts (for development/local use)
create policy "Enable insert for all users"
  on public.territorios for insert
  with check (true);

-- Also allow updates if needed
drop policy if exists "Enable update for authenticated users only" on public.territorios;
create policy "Enable update for all users"
  on public.territorios for update
  using (true);
