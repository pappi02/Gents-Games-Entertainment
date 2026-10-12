-- Storage bucket for game/category media.
--
-- Public bucket (read): game cards/detail pages need plain <img> URLs on a
-- public marketing site with no auth, so SELECT is open. Upload/modify is
-- restricted to admins via explicit RLS policies on storage.objects, same
-- role matrix as the rest of the admin surface (docs/SECURITY.md §2, §4).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'game-media', 'game-media', true,
    5242880, -- 5 MB, per docs/SECURITY.md §4 (limit file size)
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy game_media_bucket_public_read on storage.objects
    for select using (bucket_id = 'game-media');

create policy game_media_bucket_admin_write on storage.objects
    for insert with check (
        bucket_id = 'game-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );

create policy game_media_bucket_admin_update on storage.objects
    for update using (
        bucket_id = 'game-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );

create policy game_media_bucket_admin_delete on storage.objects
    for delete using (
        bucket_id = 'game-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );
