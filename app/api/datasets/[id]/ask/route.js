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

  if (!response.ok) throw new Error(`Embedding failed: ${response.status}`);

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

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

async function searchChunks(supabase, datasetId, queryEmbedding, topK = 8) {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Try RPC first
  try {
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: embeddingStr,
      match_dataset_id: datasetId,
      match_count: topK,
    });
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    // RPC not available, fall through
  }

  // Fallback: fetch chunks with embeddings and compute client-side
  const { data: chunks, error: fetchErr } = await supabase
    .from('chunks')
    .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
    .eq('dataset_id', datasetId)
    .limit(500);

  if (fetchErr || !chunks || chunks.length === 0) return [];

  const scored = chunks.map((chunk) => {
    let emb = chunk.embedding;
    if (typeof emb === 'string') {
      emb = emb.replace(/[\[\]]/g, '').split(',').map(Number);
    }
    if (!Array.isArray(emb) || emb.length === 0) {
      return { ...chunk, score: 0, embedding: undefined };
    }
    const score = cosineSimilarity(queryEmbedding, emb);
    return { ...chunk, score, embedding: undefined };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
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
      .select('id, user_id, name')
      .eq('id', id)
      .single();

    if (!dataset || dataset.user_id !== user.id) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const { question, conversation_history } = await req.json();
    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    // Search for relevant chunks using vector similarity
    const queryEmbedding = await embedQuery(question);
    const chunks = await searchChunks(supabase, id, queryEmbedding, 8);

    if (chunks.length === 0) {
      return Response.json({
        answer: 'No relevant information found in this dataset for your question.',
        metadata: { chunks_used: 0 },
      });
    }

    // Build context
    const contextText = chunks.map((c) => {
      const citation = `[[${c.doc_title || 'Untitled'}${c.year ? ` (${c.year})` : ''}]]`;
      return `${citation}\n${c.text}`;
    }).join('\n\n');

    // Build messages for Groq
    let groqMessages;

    if (conversation_history && conversation_history.length > 0) {
      groqMessages = [
        {
          role: 'system',
          content: `You are a knowledgeable assistant helping users explore their "${dataset.name}" research dataset. Answer questions using the provided context.

INSTRUCTIONS:
1. Use the provided research context to answer questions.
2. Cite sources using [[Title (Year)]] format.
3. Be precise and scientific.
4. If the context doesn't contain relevant information, say so.

RESEARCH CONTEXT:
${contextText}`,
        },
        ...conversation_history,
      ];
    } else {
      groqMessages = [
        {
          role: 'user',
          content: `You are a knowledgeable assistant helping users explore their "${dataset.name}" research dataset. Answer the question using the provided context.

INSTRUCTIONS:
1. Use the provided research context to answer questions.
2. Cite sources using [[Title (Year)]] format.
3. Be precise and scientific.
4. If the context doesn't contain relevant information, say so.

RESEARCH CONTEXT:
${contextText}

QUESTION: ${question}

ANSWER:`,
        },
      ];
    }

    // Call Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.2,
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq error:', groqResponse.status, errText);
      return Response.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await groqResponse.json();
    const answer = data.choices?.[0]?.message?.content || 'No response generated.';

    const sourceMatches = answer.match(/\[\[([^\]]+)\]\]/g);
    const sources = sourceMatches ? sourceMatches.map((m) => m.slice(2, -2)) : [];

    return Response.json({
      answer,
      metadata: {
        sources_cited: sources,
        chunks_used: chunks.length,
        model: 'llama-3.3-70b-versatile',
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    return Response.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
