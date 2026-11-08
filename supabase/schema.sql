-- Run this once in the Supabase SQL editor.
-- Every new user gets a profile row with the "guest" role.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'guest' check (role in ('guest', 'engineer', 'admin')),
  created_at timestamptz not null default now()
);

-- RLS on with no policies = the browser (anon key) can't touch this table.
-- Only the server, using the service role key, reads and writes roles.
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this script ran:
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Make yourself the first admin (swap in your email):
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'you@example.com');
