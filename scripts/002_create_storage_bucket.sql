-- Create a storage bucket for CVs
insert into storage.buckets (id, name, public)
values ('curriculos', 'curriculos', true)
on conflict (id) do nothing;

-- Allow public to upload files (authenticated users can upload their CVs during registration)
create policy "Anyone can upload CVs"
on storage.objects for insert
with check (bucket_id = 'curriculos');

-- Allow public to read CVs (so admins can download them)
create policy "Anyone can view CVs"
on storage.objects for select
using (bucket_id = 'curriculos');

-- Allow authenticated admins to delete CVs
create policy "Admins can delete CVs"
on storage.objects for delete
using (
  bucket_id = 'curriculos' and
  exists (
    select 1 from public.admin_users
    where admin_users.id = auth.uid()
  )
);
