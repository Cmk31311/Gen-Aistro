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

  // Mean-pool if per-token embeddings
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    const dim = raw[0].length;
    const count = raw.length;
    const pooled = new Array(dim).fill(0);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < dim; j++) {
        pooled[j] += raw[i][j];
      }
    }
    for (let j = 0; j < dim; j++) {
      pooled[j] /= count;
    }
    return pooled;
  }
  return raw;
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

    // Verify ownership
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

    const queryEmbedding = await embedQuery(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Try RPC first
    let results = null;
    let searchError = null;

    try {
      const rpcRes = await supabase.rpc('match_chunks', {
        query_embedding: embeddingStr,
        match_dataset_id: id,
        match_count: Math.min(topK, 20),
      });
      if (rpcRes.error) throw rpcRes.error;
      results = rpcRes.data;
    } catch (e) {
      searchError = e;
    }

    // Fallback: raw SQL via Supabase
    if (!results || results.length === 0) {
      try {
        const { data: sqlResults, error: sqlErr } = await supabase
          .from('chunks')
          .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
          .eq('dataset_id', id)
          .limit(500);

        if (!sqlErr && sqlResults && sqlResults.length > 0) {
          // Client-side cosine similarity
          const scored = sqlResults.map((chunk) => {
            let emb = chunk.embedding;
            if (typeof emb === 'string') {
              // Parse pgvector string format "[0.1,0.2,...]"
              emb = emb.replace(/[\[\]]/g, '').split(',').map(Number);
            }
            if (!Array.isArray(emb) || emb.length === 0) {
              return { ...chunk, score: 0, embedding: undefined };
            }
            // Cosine similarity
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
      } catch (fallbackErr) {
        console.error('Fallback search error:', fallbackErr);
      }
    }

    // Strip embedding from results
    const cleanResults = (results || []).map(({ embedding, ...rest }) => rest);

    return Response.json({
      results: cleanResults,
      metadata: { total: cleanResults.length, used_rpc: !searchError },
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
