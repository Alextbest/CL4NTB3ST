-- Enable live badge and mission-review updates for CL4NTB3ST.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'member_badges'
  ) then
    alter publication supabase_realtime add table public.member_badges;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mission_submissions'
  ) then
    alter publication supabase_realtime add table public.mission_submissions;
  end if;
end $$;
