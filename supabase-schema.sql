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
-- Hybrid Search: keyword + vector with Reciprocal Rank Fusion
-- Run this in Supabase SQL Editor after the initial schema
-- ============================================================

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
    limit 50
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
    limit 50
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
  select * from exact_match
  union all
  select * from fused_chunks
    where id not in (select id from exact_match)
  order by
    case match_type when 'exact' then 0 else 1 end,
    score desc
  limit match_count;
$$;
