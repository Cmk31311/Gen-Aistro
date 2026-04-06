-- Gen-Aistro: Bring Your Own Dataset - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension
create extension if not exists vector;

-- Datasets table
create table datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text default 'pending',
  total_chunks int default 0,
  processed_chunks int default 0,
  column_mapping jsonb,
  created_at timestamptz default now()
);

-- Chunks table with pgvector
create table chunks (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references datasets(id) on delete cascade,
  doc_id text,
  doc_title text,
  year int,
  url text,
  chunk_index int,
  text text not null,
  embedding vector(384),
  created_at timestamptz default now()
);

-- Index for vector similarity search
create index on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS policies
alter table datasets enable row level security;
alter table chunks enable row level security;

create policy "Users see own datasets" on datasets
  for all using (auth.uid() = user_id);

create policy "Users see own chunks" on chunks
  for all using (
    dataset_id in (select id from datasets where user_id = auth.uid())
  );

-- pgvector similarity search function
create or replace function match_chunks(
  query_embedding text,
  match_dataset_id uuid,
  match_count int default 8
)
returns table (
  id uuid,
  doc_id text,
  doc_title text,
  year int,
  url text,
  chunk_index int,
  text text,
  score float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.doc_id,
    chunks.doc_title,
    chunks.year,
    chunks.url,
    chunks.chunk_index,
    chunks.text,
    1 - (chunks.embedding <=> query_embedding::vector) as score
  from chunks
  where chunks.dataset_id = match_dataset_id
  order by chunks.embedding <=> query_embedding::vector
  limit match_count;
$$;

-- ============================================================
-- Distributed rate limiting (works across serverless instances)
-- ============================================================

create table if not exists rate_limits (
  ip text not null,
  endpoint text not null,
  request_count int default 1,
  window_start timestamptz default now(),
  primary key (ip, endpoint)
);

-- No RLS needed — accessed only by service role key

-- Atomic upsert + check function
create or replace function check_and_increment_rate_limit(
  p_ip text,
  p_endpoint text,
  p_limit int default 30,
  p_window_start timestamptz default now() - interval '5 minutes'
)
returns jsonb
language plpgsql
as $$
declare
  v_count int;
  v_allowed boolean;
begin
  -- Reset window if expired
  update rate_limits
  set request_count = 1, window_start = now()
  where ip = p_ip
    and endpoint = p_endpoint
    and window_start < p_window_start
  returning request_count into v_count;

  if not found then
    -- Insert new or increment existing within window
    insert into rate_limits (ip, endpoint, request_count, window_start)
    values (p_ip, p_endpoint, 1, now())
    on conflict (ip, endpoint) do update
      set request_count = rate_limits.request_count + 1
    returning request_count into v_count;
  end if;

  v_allowed := coalesce(v_count, 1) <= p_limit;
  return jsonb_build_object('allowed', v_allowed, 'request_count', coalesce(v_count, 1));
end;
$$;

-- ============================================================
-- Paper annotations (user highlights + notes on publications)
-- ============================================================

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paper_id text not null,
  highlighted_text text,
  note text,
  created_at timestamptz default now()
);

alter table annotations enable row level security;

create policy "Users manage own annotations" on annotations
  for all using (auth.uid() = user_id);

create index if not exists annotations_paper_id_idx on annotations(user_id, paper_id);

-- ============================================================
-- Query result cache (reduces HuggingFace API calls)
-- ============================================================

create table if not exists query_cache (
  query_hash text primary key,
  query_text text,
  embedding vector(384),
  results jsonb,
  created_at timestamptz default now()
);

-- Auto-clean entries older than 24 hours (run via pg_cron or Supabase scheduled function)
-- delete from query_cache where created_at < now() - interval '24 hours';

-- ============================================================
-- Feedback table (thumbs up/down on AI answers)
-- ============================================================

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query text,
  answer text,
  sources jsonb,
  rating smallint check (rating in (1, -1)),
  context text default 'nasa',  -- 'nasa' or dataset id
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Users insert own feedback" on feedback
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users see own feedback" on feedback
  for select using (auth.uid() = user_id);

-- ============================================================
-- Saved research sessions
-- ============================================================

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  messages jsonb not null default '[]',
  dataset_id uuid references datasets(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table sessions enable row level security;

create policy "Users manage own sessions" on sessions
  for all using (auth.uid() = user_id);

-- ============================================================
-- Hybrid Search: keyword + vector with Reciprocal Rank Fusion
-- Run this in Supabase SQL Editor after the initial schema
-- ============================================================

-- ============================================================
-- pg_trgm: fast trigram indexes for ilike '%term%' fallback
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists chunks_text_trgm_idx
  on chunks using gist (text gist_trgm_ops);

create index if not exists chunks_doc_title_trgm_idx
  on chunks using gist (doc_title gist_trgm_ops);

-- GIN indexes for full-text keyword search
create index if not exists chunks_text_fts_idx
  on chunks using gin(to_tsvector('english', text));

create index if not exists chunks_doc_title_fts_idx
  on chunks using gin(to_tsvector('english', coalesce(doc_title, '')));

-- Hybrid search function: exact match + keyword + vector, fused with RRF
create or replace function hybrid_search_chunks(
  query_text        text,
  query_embedding   text,
  match_dataset_id  uuid,
  match_count       int default 8,
  rrf_k             int default 60,
  keyword_weight    float default 0.4,
  vector_weight     float default 0.6
)
returns table (
  id          uuid,
  doc_id      text,
  doc_title   text,
  year        int,
  url         text,
  chunk_index int,
  text        text,
  score       float,
  match_type  text
)
language sql stable
as $$
  with

  -- 1. Exact title/doc_id match (highest priority)
  exact_match as (
    select
      c.id, c.doc_id, c.doc_title, c.year, c.url, c.chunk_index, c.text,
      1.0::float as score,
      'exact'::text as match_type
    from chunks c
    where c.dataset_id = match_dataset_id
      and (
        c.doc_title ilike '%' || query_text || '%'
        or c.doc_id ilike '%' || query_text || '%'
      )
    limit 20
  ),

  -- 2. Full-text keyword search (ranked by ts_rank)
  keyword_ranked as (
    select
      c.id,
      row_number() over (
        order by ts_rank(
          to_tsvector('english', c.text || ' ' || coalesce(c.doc_title, '')),
          plainto_tsquery('english', query_text)
        ) desc
      ) as keyword_rank
    from chunks c
    where c.dataset_id = match_dataset_id
      and to_tsvector('english', c.text || ' ' || coalesce(c.doc_title, ''))
          @@ plainto_tsquery('english', query_text)
    limit greatest(match_count * 5, 100)
  ),

  -- 3. Vector similarity search
  vector_ranked as (
    select
      c.id,
      row_number() over (
        order by c.embedding <=> query_embedding::vector
      ) as vector_rank
    from chunks c
    where c.dataset_id = match_dataset_id
    limit greatest(match_count * 5, 100)
  ),

  -- 4. RRF fusion of keyword + vector
  fused as (
    select
      coalesce(k.id, v.id) as id,
      (
        coalesce(keyword_weight / (rrf_k + k.keyword_rank)::float, 0)
        + coalesce(vector_weight / (rrf_k + v.vector_rank)::float, 0)
      ) as rrf_score
    from keyword_ranked k
    full outer join vector_ranked v on k.id = v.id
  ),

  -- 5. Join fused scores back to chunk data
  fused_chunks as (
    select
      c.id, c.doc_id, c.doc_title, c.year, c.url, c.chunk_index, c.text,
      f.rrf_score as score,
      'hybrid'::text as match_type
    from fused f
    join chunks c on c.id = f.id
    where c.dataset_id = match_dataset_id
    order by f.rrf_score desc
    limit match_count
  )

  -- 6. Exact matches first, then hybrid results
  select * from (
    select * from exact_match
    union all
    select * from fused_chunks
      where id not in (select id from exact_match)
  ) combined
  order by
    case match_type when 'exact' then 0 else 1 end,
    score desc
  limit match_count;
$$;
