-- Messenger17 Supabase schema
-- Выполни этот файл в Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 32),
  full_name text,
  avatar_url text,
  bio text,
  status text default 'В сети',
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b),
  check (user_a <> user_b)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  created_at timestamptz default now()
);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'subscriber' check (role in ('owner', 'admin', 'subscriber')),
  joined_at timestamptz default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', 'Новый пользователь')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation_id and cm.user_id = target_user_id
  );
$$;

create or replace function public.get_friends(current_user_id uuid)
returns table(friend_id uuid, username text, full_name text, avatar_url text, status text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, p.status
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = current_user_id then f.user_b else f.user_a end
  where f.user_a = current_user_id or f.user_b = current_user_id
  order by p.username;
$$;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.channel_posts enable row level security;
alter table public.news enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "requests visible to participants" on public.friend_requests for select using (auth.uid() in (sender_id, receiver_id));
create policy "users create requests" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "receiver updates request" on public.friend_requests for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

create policy "friendships visible to participants" on public.friendships for select using (auth.uid() in (user_a, user_b));
create policy "participants create friendships" on public.friendships for insert with check (auth.uid() in (user_a, user_b));

create policy "members read conversations" on public.conversations for select using (public.is_conversation_member(id, auth.uid()));
create policy "authenticated create conversations" on public.conversations for insert with check (auth.uid() is not null);
create policy "members update conversations" on public.conversations for update using (public.is_conversation_member(id, auth.uid()));

create policy "members read conversation members" on public.conversation_members for select using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "authenticated add conversation members" on public.conversation_members for insert with check (auth.uid() is not null);

create policy "members read messages" on public.messages for select using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "members send messages" on public.messages for insert with check (
  auth.uid() = author_id and public.is_conversation_member(conversation_id, auth.uid())
);

create policy "groups readable" on public.groups for select using (true);
create policy "users create groups" on public.groups for insert with check (auth.uid() = owner_id);
create policy "group members readable" on public.group_members for select using (true);
create policy "users join or create group memberships" on public.group_members for insert with check (auth.uid() = user_id);

create policy "channels readable" on public.channels for select using (true);
create policy "users create channels" on public.channels for insert with check (auth.uid() = owner_id);
create policy "channel members readable" on public.channel_members for select using (true);
create policy "users join or create channel memberships" on public.channel_members for insert with check (auth.uid() = user_id);

create policy "channel posts readable" on public.channel_posts for select using (true);
create policy "channel admins publish" on public.channel_posts for insert with check (
  auth.uid() = author_id and exists (
    select 1 from public.channel_members cm
    where cm.channel_id = channel_id and cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
  )
);

create policy "news readable" on public.news for select using (true);
create policy "authenticated publish news" on public.news for insert with check (auth.uid() = author_id);
