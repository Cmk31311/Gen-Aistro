import { createServerClient } from '../../../../../lib/supabase';

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

async function embedQuery(text) {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: text.trim(),
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const raw = await response.json();
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    const dim = raw[0].length;
    const count = raw.length;
    const pooled = new Array(dim).fill(0);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < dim; j++) pooled[j] += raw[i][j];
    }
    for (let j = 0; j < dim; j++) pooled[j] /= count;
    return pooled;
  }
  return raw;
}

// Detect query intent to drive hybrid search weights
function detectQueryIntent(question) {
  const q = question.toLowerCase();

  const isCountQuery = /\b(how many|count|total|number of|how much|quantity|tally)\b/.test(q);

  const isExactNameQuery = (
    /["']/.test(question) ||
    /\b[A-Z][a-zA-Z]+\s+\d{3,}\b/.test(question) ||  // e.g. "Aguemour 008"
    /\b[A-Z][a-z]+(?:\s+[A-Z0-9][a-zA-Z0-9]*){1,3}\b/.test(question)  // Multi-word proper noun
  );

  return {
    isCountQuery,
    isExactNameQuery,
    keywordWeight: isExactNameQuery ? 0.7 : (isCountQuery ? 0.5 : 0.3),
    vectorWeight:  isExactNameQuery ? 0.3 : (isCountQuery ? 0.5 : 0.7),
  };
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dataset } = await supabase
      .from('datasets')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!dataset || dataset.user_id !== user.id) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const { query, topK = 8 } = await req.json();
    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const intent = detectQueryIntent(query);
    const queryEmbedding = await embedQuery(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    let results = null;
    let usedHybrid = false;

    // Try hybrid RPC first
    try {
      const { data, error } = await supabase.rpc('hybrid_search_chunks', {
        query_text:       query,
        query_embedding:  embeddingStr,
        match_dataset_id: id,
        match_count:      Math.min(topK, 20),
        rrf_k:            60,
        keyword_weight:   intent.keywordWeight,
        vector_weight:    intent.vectorWeight,
      });
      if (!error && data && data.length > 0) {
        results = data;
        usedHybrid = true;
      }
    } catch (e) {
      // RPC not yet available, fall through
    }

    // Fallback: vector-only RPC
    if (!results || results.length === 0) {
      try {
        const { data, error } = await supabase.rpc('match_chunks', {
          query_embedding:  embeddingStr,
          match_dataset_id: id,
          match_count:      Math.min(topK, 20),
        });
        if (!error && data && data.length > 0) results = data;
      } catch (e) {
        // Fall through to client-side
      }
    }

    // Final fallback: keyword-filtered client-side cosine similarity
    if (!results || results.length === 0) {
      const escaped = query.replace(/'/g, "''");
      const { data: titleChunks } = await supabase
        .from('chunks')
        .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
        .eq('dataset_id', id)
        .ilike('doc_title', `%${escaped}%`)
        .limit(100);

      const { data: textChunks } = await supabase
        .from('chunks')
        .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
        .eq('dataset_id', id)
        .ilike('text', `%${escaped}%`)
        .limit(400);

      let merged = [...(titleChunks || []), ...(textChunks || [])];
      const seen = new Set();
      merged = merged.filter(c => seen.has(c.id) ? false : seen.add(c.id));

      const { data: allChunks } = merged.length > 0
        ? { data: merged }
        : await supabase
            .from('chunks')
            .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
            .eq('dataset_id', id)
            .limit(500);

      if (allChunks && allChunks.length > 0) {
        const scored = allChunks.map((chunk) => {
          let emb = chunk.embedding;
          if (typeof emb === 'string') {
            emb = emb.replace(/[\[\]]/g, '').split(',').map(Number);
          }
          if (!Array.isArray(emb) || emb.length === 0) {
            return { ...chunk, score: 0, embedding: undefined };
          }
          let dot = 0, magA = 0, magB = 0;
          for (let i = 0; i < emb.length; i++) {
            dot += queryEmbedding[i] * emb[i];
            magA += queryEmbedding[i] * queryEmbedding[i];
            magB += emb[i] * emb[i];
          }
          const score = magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
          return { ...chunk, score, embedding: undefined };
        });

        scored.sort((a, b) => b.score - a.score);
        results = scored.slice(0, topK);
      }
    }

    const cleanResults = (results || []).map(({ embedding, ...rest }) => rest);

    return Response.json({
      results: cleanResults,
      metadata: {
        total: cleanResults.length,
        used_hybrid: usedHybrid,
        intent: { isCountQuery: intent.isCountQuery, isExactNameQuery: intent.isExactNameQuery },
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
