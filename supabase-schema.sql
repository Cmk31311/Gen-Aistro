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
