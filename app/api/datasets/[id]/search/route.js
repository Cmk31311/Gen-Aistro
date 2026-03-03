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

    // pgvector cosine distance search
    const { data: results, error: searchError } = await supabase.rpc('match_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_dataset_id: id,
      match_count: Math.min(topK, 20),
    });

    if (searchError) {
      // Fallback: direct query if RPC not set up yet
      const { data: chunks } = await supabase
        .from('chunks')
        .select('id, doc_id, doc_title, year, url, chunk_index, text')
        .eq('dataset_id', id)
        .limit(200);

      // Client-side cosine similarity fallback
      const scored = (chunks || []).map((chunk) => {
        // We don't have embeddings in the select for payload size reasons
        // This fallback just returns the first N chunks
        return { ...chunk, score: 0 };
      });

      return Response.json({
        results: scored.slice(0, topK),
        metadata: { fallback: true, total: scored.length },
      });
    }

    return Response.json({
      results: results || [],
      metadata: { total: (results || []).length },
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
