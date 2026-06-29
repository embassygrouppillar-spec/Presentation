-- Presentation App Schema
-- Replaces game-specific tables with presentation-focused ones

-- ─── Presentations ─────────────────────────────────────────────────────────
create table if not exists presentations (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'Untitled Presentation',
  description     text,
  join_code       text unique not null,          -- 6-char code for audience to join
  owner_phone     text,                          -- presenter's phone (links to players table if needed)
  is_live         boolean default false,         -- currently being presented
  current_slide   integer default 0,            -- index of active slide
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Slides ────────────────────────────────────────────────────────────────
create table if not exists slides (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid references presentations(id) on delete cascade,
  slide_order     integer not null,
  slide_type      text not null default 'content', -- content | poll | qa | reaction | title | image
  title           text,
  body            text,                          -- markdown or plain text content
  image_url       text,                          -- optional background/image
  settings        jsonb default '{}',            -- type-specific settings (colors, layout, etc.)
  created_at      timestamptz default now()
);

-- ─── Polls (interactive slide type) ────────────────────────────────────────
create table if not exists polls (
  id              uuid primary key default gen_random_uuid(),
  slide_id        uuid references slides(id) on delete cascade,
  question        text not null,
  poll_type       text default 'multiple_choice', -- multiple_choice | word_cloud | rating | open_ended
  allow_multiple  boolean default false,
  is_open         boolean default false,         -- accepting responses
  created_at      timestamptz default now()
);

create table if not exists poll_options (
  id              uuid primary key default gen_random_uuid(),
  poll_id         uuid references polls(id) on delete cascade,
  option_text     text not null,
  option_order    integer not null,
  vote_count      integer default 0
);

create table if not exists poll_responses (
  id              uuid primary key default gen_random_uuid(),
  poll_id         uuid references polls(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  selected_option uuid references poll_options(id),
  text_response   text,                          -- for open-ended / word cloud
  submitted_at    timestamptz default now(),
  unique(poll_id, participant_id)
);

-- ─── Q&A ───────────────────────────────────────────────────────────────────
create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid references presentations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  question_text   text not null,
  is_answered     boolean default false,
  is_pinned       boolean default false,
  upvotes         integer default 0,
  asked_at        timestamptz default now()
);

create table if not exists question_upvotes (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid references questions(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  unique(question_id, participant_id)
);

-- ─── Reactions (live emoji reactions) ──────────────────────────────────────
create table if not exists reactions (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid references presentations(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  emoji           text not null,                 -- emoji character
  slide_index     integer,                       -- which slide it was on
  reacted_at      timestamptz default now()
);

-- ─── Participants (audience members) ───────────────────────────────────────
create table if not exists participants (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid references presentations(id) on delete cascade,
  display_name    text not null,
  phone_number    text,                          -- optional, for SMS participation
  joined_at       timestamptz default now(),
  is_active       boolean default true,
  unique(presentation_id, phone_number)
);

-- ─── Presentation Sessions (track live session state) ──────────────────────
create table if not exists presentation_sessions (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid references presentations(id) on delete cascade,
  started_at      timestamptz default now(),
  ended_at        timestamptz,
  participant_count integer default 0
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_slides_presentation on slides(presentation_id, slide_order);
create index if not exists idx_polls_slide on polls(slide_id);
create index if not exists idx_poll_options_poll on poll_options(poll_id);
create index if not exists idx_poll_responses_poll on poll_responses(poll_id);
create index if not exists idx_questions_presentation on questions(presentation_id);
create index if not exists idx_reactions_presentation on reactions(presentation_id);
create index if not exists idx_participants_presentation on participants(presentation_id);
create index if not exists idx_presentations_join_code on presentations(join_code);

-- ─── RLS Policies ───────────────────────────────────────────────────────────
alter table presentations enable row level security;
alter table slides enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_responses enable row level security;
alter table questions enable row level security;
alter table question_upvotes enable row level security;
alter table reactions enable row level security;
alter table participants enable row level security;
alter table presentation_sessions enable row level security;

-- Public read for audience-facing data
create policy "Public read presentations" on presentations for select using (true);
create policy "Public read slides" on slides for select using (true);
create policy "Public read polls" on polls for select using (true);
create policy "Public read poll_options" on poll_options for select using (true);
create policy "Public read poll_responses" on poll_responses for select using (true);
create policy "Public read questions" on questions for select using (true);
create policy "Public read reactions" on reactions for select using (true);
create policy "Public read participants" on participants for select using (true);
create policy "Public read sessions" on presentation_sessions for select using (true);

-- ─── Realtime ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table presentations;
alter publication supabase_realtime add table slides;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table poll_responses;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table participants;
