import { createServerClient } from './supabase';

const TTL_HOURS = 24;

/**
 * Hash a query string to a short cache key.
 * Uses a simple djb2-style hash (no crypto needed).
 */
function hashQuery(text) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h) ^ normalized.charCodeAt(i);
    h = h >>> 0; // keep 32-bit unsigned
  }
  return `q_${h.toString(16).padStart(8, '0')}`;
}

/**
 * Look up a cached (embedding + results) for a query.
 * Returns { embedding, results } or null on miss/error.
 */
export async function getCachedQuery(queryText) {
  try {
    const supabase = createServerClient();
    const hash = hashQuery(queryText);
    const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('query_cache')
      .select('embedding, results')
      .eq('query_hash', hash)
      .gte('created_at', cutoff)
      .maybeSingle();

    if (error || !data) return null;
    return { embedding: data.embedding, results: data.results };
  } catch {
    return null;
  }
}

/**
 * Store a query's embedding and results in the cache.
 */
export async function setCachedQuery(queryText, embedding, results) {
  try {
    const supabase = createServerClient();
    const hash = hashQuery(queryText);

    await supabase.from('query_cache').upsert({
      query_hash: hash,
      query_text: queryText.slice(0, 500),
      embedding: `[${embedding.join(',')}]`,
      results,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Cache write failure is non-fatal
  }
}
