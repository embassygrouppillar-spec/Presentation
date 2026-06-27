-- B&I Family Feud — Full Schema
-- Run this in your Supabase SQL editor

-- ─── Players ───────────────────────────────────────────────────────────────
create table if not exists players (
  id              uuid primary key default gen_random_uuid(),
  phone_number    text unique not null,        -- E.164 format: +13145551234
  display_name    text not null,
  registered_at   timestamptz default now(),
  total_score     integer default 0,
  is_host         boolean default false
);

-- ─── Members (the 18 B&I members being questioned about) ───────────────────
create table if not exists members (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  role            text not null,
  company         text,
  fun_facts       text,                        -- used for AI question generation
  display_order   integer unique not null      -- order they appear in the grid
);

-- ─── Questions (AI-generated, one per member) ──────────────────────────────
create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid references members(id) on delete cascade,
  question_text   text not null,
  is_active       boolean default false,       -- only one active at a time
  is_complete     boolean default false,
  created_at      timestamptz default now()
);

-- ─── Answers (the board — 6 per question) ──────────────────────────────────
create table if not exists question_answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid references questions(id) on delete cascade,
  answer_text     text not null,
  points          integer not null,
  display_order   integer not null,            -- 1–6
  is_revealed     boolean default false
);

-- ─── Player responses (what people text in) ────────────────────────────────
create table if not exists player_responses (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid references players(id) on delete cascade,
  question_id     uuid references questions(id) on delete cascade,
  raw_answer      text not null,               -- exactly what they texted
  matched_answer  text,                        -- board answer it matched
  points_earned   integer default 0,
  received_at     timestamptz default now(),
  unique(player_id, question_id)               -- one answer per player per round
);

-- ─── Game state (single row, controls the whole show) ──────────────────────
create table if not exists game_state (
  id              integer primary key default 1 check (id = 1),  -- singleton
  active_question_id uuid references questions(id),
  game_phase      text default 'registration', -- registration | playing | results
  strikes         integer default 0,
  updated_at      timestamptz default now()
);

insert into game_state (id) values (1) on conflict do nothing;

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_players_phone on players(phone_number);
create index if not exists idx_responses_question on player_responses(question_id);
create index if not exists idx_responses_player on player_responses(player_id);
create index if not exists idx_answers_question on question_answers(question_id);

-- ─── RLS Policies ───────────────────────────────────────────────────────────
alter table players enable row level security;
alter table members enable row level security;
alter table questions enable row level security;
alter table question_answers enable row level security;
alter table player_responses enable row level security;
alter table game_state enable row level security;

-- Public read for game display
create policy "Public read players" on players for select using (true);
create policy "Public read members" on members for select using (true);
create policy "Public read questions" on questions for select using (true);
create policy "Public read answers" on question_answers for select using (true);
create policy "Public read responses" on player_responses for select using (true);
create policy "Public read game state" on game_state for select using (true);

-- Service role (used by API routes) can do everything
-- This is handled by SUPABASE_SERVICE_ROLE_KEY in the API

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- Enable realtime on tables the board needs to watch
alter publication supabase_realtime add table player_responses;
alter publication supabase_realtime add table game_state;
alter publication supabase_realtime add table question_answers;
