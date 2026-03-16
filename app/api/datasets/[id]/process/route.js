import { createServerClient } from '../../../../../lib/supabase';

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * 2 ** i));
    }
  }
}

async function embedTexts(texts) {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: texts,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HuggingFace API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();

  // HF returns per-token embeddings for each input — mean-pool each
  return raw.map((tokenEmbeddings) => {
    if (!Array.isArray(tokenEmbeddings[0])) {
      return tokenEmbeddings; // already pooled (1D array)
    }
    const dim = tokenEmbeddings[0].length;
    const count = tokenEmbeddings.length;
    const pooled = new Array(dim).fill(0);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < dim; j++) {
        pooled[j] += tokenEmbeddings[i][j];
      }
    }
    for (let j = 0; j < dim; j++) {
      pooled[j] /= count;
    }
    return pooled;
  });
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

    // Verify dataset ownership
    const { data: dataset, error: dsError } = await supabase
      .from('datasets')
      .select('id, user_id, processed_chunks')
      .eq('id', id)
      .single();

    if (dsError || !dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }
    if (dataset.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { chunks } = await req.json();

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0 || chunks.length > 20) {
      return Response.json({ error: 'Provide 1-20 chunks' }, { status: 400 });
    }

    // Extract texts for batch embedding (full text — no truncation)
    const texts = chunks.map((c) => c.text);
    const embeddings = await withRetry(() => embedTexts(texts));

    // Prepare rows for insertion
    const rows = chunks.map((c, i) => ({
      dataset_id: id,
      doc_id: c.doc_id || null,
      doc_title: c.doc_title || null,
      year: c.year || null,
      url: c.url || null,
      chunk_index: c.chunk_index ?? i,
      text: c.text,
      embedding: JSON.stringify(embeddings[i]),
    }));

    const { error: insertError } = await supabase.from('chunks').insert(rows);
    if (insertError) throw insertError;

    // Update processed count
    const newCount = (dataset.processed_chunks || 0) + chunks.length;
    await supabase
      .from('datasets')
      .update({ processed_chunks: newCount })
      .eq('id', id);

    return Response.json({ processed: chunks.length, total_processed: newCount });
  } catch (error) {
    console.error('Process error:', error);
    return Response.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
