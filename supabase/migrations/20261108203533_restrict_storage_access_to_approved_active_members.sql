drop policy if exists "clan avatars read approved or moderation" on storage.objects;
create policy "clan avatars read approved or moderation"
on storage.objects for select to authenticated
using (
  bucket_id = 'clan-avatars'
  and (
    public.is_active_clan_leader()
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.avatar_path = objects.name
          and p.avatar_status in ('pending','rejected')
      )
    )
    or (
      exists (
        select 1 from public.profiles requester
        where requester.id = (select auth.uid())
          and requester.approval_status = 'approved'
          and requester.membership_status = 'active'
      )
      and exists (
        select 1 from public.profiles owner
        where owner.avatar_path = objects.name
          and owner.avatar_status = 'approved'
          and owner.approval_status = 'approved'
          and owner.membership_status = 'active'
      )
    )
  )
);

drop policy if exists "clan members read social post media" on storage.objects;
create policy "approved active members read social post media"
on storage.objects for select to authenticated
using (
  bucket_id = 'social-post-media'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.approval_status = 'approved'
      and p.membership_status = 'active'
  )
);

drop policy if exists "members upload own social post media" on storage.objects;
create policy "approved active members upload own social post media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'social-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.approval_status = 'approved'
      and p.membership_status = 'active'
  )
);

drop policy if exists "members upload own mission evidence" on storage.objects;
create policy "approved active members upload own mission evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mission-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.approval_status = 'approved'
      and p.membership_status = 'active'
  )
);

drop policy if exists "members and clan admins read mission evidence" on storage.objects;
create policy "members and clan admins read mission evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'mission-evidence'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.approval_status = 'approved'
          and p.membership_status = 'active'
      )
    )
    or (select public.is_active_clan_admin())
  )
);
