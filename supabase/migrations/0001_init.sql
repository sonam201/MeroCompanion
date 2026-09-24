-- MeroCompanion initial schema
-- Mirrors the domain model in ARCHITECTURE.md. All tables are owned by
-- auth.users(id) and locked down with row-level security so a user can only
-- ever see/modify their own rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on goals (user_id);

alter table goals enable row level security;

create policy "goals are owner-only" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type task_tag as enum ('application', 'interview_prep', 'networking', 'skill_building');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references goals (id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  tag task_tag,
  scheduled_at timestamptz,
  due_at timestamptz,
  estimated_pomodoros integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on tasks (user_id);
create index tasks_goal_id_idx on tasks (goal_id);
create index tasks_scheduled_at_idx on tasks (scheduled_at);

alter table tasks enable row level security;

create policy "tasks are owner-only" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- pomodoro_sessions
-- ---------------------------------------------------------------------------
create table pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_focus_min integer not null default 25,
  planned_break_min integer not null default 5,
  completed boolean not null default false
);

create index pomodoro_sessions_task_id_idx on pomodoro_sessions (task_id);
create index pomodoro_sessions_user_id_idx on pomodoro_sessions (user_id);

alter table pomodoro_sessions enable row level security;

create policy "pomodoro_sessions are owner-only" on pomodoro_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- session_notes
-- ---------------------------------------------------------------------------
create table session_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references pomodoro_sessions (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index session_notes_task_id_idx on session_notes (task_id);
create index session_notes_session_id_idx on session_notes (session_id);

alter table session_notes enable row level security;

create policy "session_notes are owner-only" on session_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reminder_preferences
-- ---------------------------------------------------------------------------
-- schedule is a small JSON description the user configures, e.g.
--   { "times": ["09:00", "13:00", "17:30"], "days": [1,2,3,4,5] }
-- next_send_at is computed by the app/edge function whenever the schedule
-- changes or after a reminder is sent, and is what the poller filters on.
create table reminder_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  timezone text not null default 'UTC',
  schedule jsonb not null default '{"times": ["09:00"], "days": [1,2,3,4,5]}',
  next_send_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table reminder_preferences enable row level security;

create policy "reminder_preferences are owner-only" on reminder_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_log
-- ---------------------------------------------------------------------------
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  type text not null,
  payload_summary text
);

create index notification_log_user_id_idx on notification_log (user_id);

alter table notification_log enable row level security;

create policy "notification_log are owner-only" on notification_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- keep reminder_preferences.user_id row present + email in sync via a
-- trigger on new auth users (created row with defaults on signup)
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.reminder_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
