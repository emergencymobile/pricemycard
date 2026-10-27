-- Public bucket replacing Base44's UploadFile / UploadPublicFile.
-- Files are readable by URL (listing photos, avatars, message images); only
-- signed-in users can upload, and only into a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do nothing;

create policy "uploads: users upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "uploads: users delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
