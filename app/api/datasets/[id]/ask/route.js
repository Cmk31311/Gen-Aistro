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

// Detect query intent to drive hybrid search weights
function detectQueryIntent(question) {
  const q = question.toLowerCase();

  const isCountQuery = /\b(how many|count|total|number of|how much|quantity|tally)\b/.test(q);

  const yearMatch = q.match(/\b(in|from|during|year)\s+(1[89]\d{2}|20[012]\d)\b/);
  const mentionedYear = yearMatch ? parseInt(yearMatch[2]) : null;

  const isExactNameQuery = (
    /["']/.test(question) ||
    /\b[A-Z][a-zA-Z]+\s+\d{3,}\b/.test(question) ||  // e.g. "Aguemour 008"
    /\b[A-Z][a-z]+(?:\s+[A-Z0-9][a-zA-Z0-9]*){1,3}\b/.test(question)  // Multi-word proper noun
  );

  return {
    isCountQuery,
    isExactNameQuery,
    mentionedYear,
    // Exact name queries lean heavily keyword; concept queries lean vector
    keywordWeight: isExactNameQuery ? 0.7 : (isCountQuery ? 0.5 : 0.3),
    vectorWeight:  isExactNameQuery ? 0.3 : (isCountQuery ? 0.5 : 0.7),
  };
}

// Fetch aggregate stats from DB for count-type questions
async function fetchAggregateStats(supabase, datasetId, intent) {
  const stats = {};

  // Count distinct doc_ids (= number of documents/entries)
  const { data: docRows } = await supabase
    .from('chunks')
    .select('doc_id')
    .eq('dataset_id', datasetId);

  const allDocIds = (docRows || []).map(d => d.doc_id).filter(Boolean);
  stats.total_documents = new Set(allDocIds).size;

  // Total chunk count
  const { count: totalChunks } = await supabase
    .from('chunks')
    .select('id', { count: 'exact', head: true })
    .eq('dataset_id', datasetId);
  stats.total_chunks = totalChunks || 0;

  // Year-specific count if a year was mentioned
  if (intent.mentionedYear) {
    const { data: yearRows } = await supabase
      .from('chunks')
      .select('doc_id')
      .eq('dataset_id', datasetId)
      .eq('year', intent.mentionedYear);
    const yearDocIds = new Set((yearRows || []).map(d => d.doc_id).filter(Boolean));
    stats.documents_in_year = yearDocIds.size;
    stats.year_queried = intent.mentionedYear;
  }

  // Year range
  const { data: yearData } = await supabase
    .from('chunks')
    .select('year')
    .eq('dataset_id', datasetId)
    .not('year', 'is', null)
    .order('year', { ascending: true });

  if (yearData && yearData.length > 0) {
    const years = [...new Set(yearData.map(r => r.year))].sort((a, b) => a - b);
    const yearCounts = {};
    for (const r of yearData) {
      if (r.year) yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
    }
    stats.year_range = { min: years[0], max: years[years.length - 1] };
    // Only show year breakdown if range is reasonable
    if (years.length <= 30) {
      stats.year_distribution = Object.entries(yearCounts)
        .map(([y, n]) => `${y}: ${n} entries`)
        .join(', ');
    }
  }

  return stats;
}

async function searchChunks(supabase, datasetId, queryText, queryEmbedding, topK = 8, keywordWeight = 0.4, vectorWeight = 0.6) {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Try hybrid RPC first
  try {
    const { data, error } = await supabase.rpc('hybrid_search_chunks', {
      query_text:       queryText,
      query_embedding:  embeddingStr,
      match_dataset_id: datasetId,
      match_count:      topK,
      rrf_k:            60,
      keyword_weight:   keywordWeight,
      vector_weight:    vectorWeight,
    });
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    // RPC not yet available, fall through
  }

  // Fallback: keyword-filtered client-side cosine similarity
  // Try title match first (exact name queries)
  const escaped = queryText.replace(/'/g, "''");
  const { data: titleChunks } = await supabase
    .from('chunks')
    .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
    .eq('dataset_id', datasetId)
    .ilike('doc_title', `%${escaped}%`)
    .limit(100);

  // Then text keyword search
  const { data: textChunks } = await supabase
    .from('chunks')
    .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
    .eq('dataset_id', datasetId)
    .ilike('text', `%${escaped}%`)
    .limit(400);

  // Merge, dedup, fallback to all chunks if nothing found
  let fetchData = [...(titleChunks || []), ...(textChunks || [])];
  const seen = new Set();
  fetchData = fetchData.filter(c => seen.has(c.id) ? false : seen.add(c.id));

  if (fetchData.length === 0) {
    const { data: all } = await supabase
      .from('chunks')
      .select('id, doc_id, doc_title, year, url, chunk_index, text, embedding')
      .eq('dataset_id', datasetId)
      .limit(500);
    fetchData = all || [];
  }

  if (!fetchData || fetchData.length === 0) return [];

  const scored = fetchData.map((chunk) => {
    let emb = chunk.embedding;
    if (typeof emb === 'string') {
      emb = emb.replace(/[\[\]]/g, '').split(',').map(Number);
    }
    if (!Array.isArray(emb) || emb.length === 0) return { ...chunk, score: 0, embedding: undefined };
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

    // Detect intent to drive retrieval strategy
    const intent = detectQueryIntent(question);

    // Hybrid retrieval with intent-driven weights
    const queryEmbedding = await embedQuery(question);
    const chunks = await searchChunks(
      supabase, id, question, queryEmbedding, 8,
      intent.keywordWeight, intent.vectorWeight
    );

    // Fetch aggregate stats for count questions
    let statsBlock = '';
    if (intent.isCountQuery) {
      try {
        const stats = await fetchAggregateStats(supabase, id, intent);
        const lines = [
          `Total documents/entries in dataset: ${stats.total_documents}`,
          `Total indexed text chunks: ${stats.total_chunks}`,
        ];
        if (stats.documents_in_year !== undefined) {
          lines.push(`Documents from ${stats.year_queried}: ${stats.documents_in_year}`);
        }
        if (stats.year_range) {
          lines.push(`Year range: ${stats.year_range.min} – ${stats.year_range.max}`);
        }
        if (stats.year_distribution) {
          lines.push(`Year breakdown: ${stats.year_distribution}`);
        }
        statsBlock = `\nDATASET AGGREGATE STATISTICS (authoritative — use these for counts):\n${lines.join('\n')}\n`;
      } catch (statsErr) {
        console.error('Stats fetch error:', statsErr);
      }
    }

    if (chunks.length === 0 && !statsBlock) {
      return Response.json({
        answer: 'No relevant information found in this dataset for your question.',
        metadata: { chunks_used: 0 },
      });
    }

    // Build context from retrieved chunks
    const contextText = chunks.map((c) => {
      const citation = `[[${c.doc_title || c.doc_id || 'Untitled'}${c.year ? ` (${c.year})` : ''}]]`;
      return `${citation}\n${c.text}`;
    }).join('\n\n');

    const systemPrompt = `You are a knowledgeable assistant helping users explore their "${dataset.name}" research dataset. Answer questions using the provided context.

INSTRUCTIONS:
1. Use the provided research context to answer questions.
2. Cite sources using [[Title (Year)]] format.
3. Be precise and factual — only state what the context supports.
4. If asked about a specific named item and the context contains it, describe it fully.
5. For count or aggregate questions, use the DATASET AGGREGATE STATISTICS section — these numbers are authoritative counts from the full database. Do NOT estimate counts from the limited context chunks.
6. If the context doesn't contain relevant information, say so clearly.
${statsBlock}
RESEARCH CONTEXT:
${contextText}`;

    let groqMessages;
    if (conversation_history && conversation_history.length > 0) {
      groqMessages = [
        { role: 'system', content: systemPrompt },
        ...conversation_history,
      ];
    } else {
      groqMessages = [
        {
          role: 'user',
          content: `${systemPrompt}\n\nQUESTION: ${question}\n\nANSWER:`,
        },
      ];
    }

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
        intent: { isCountQuery: intent.isCountQuery, isExactNameQuery: intent.isExactNameQuery },
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    return Response.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
