import { createServerClient } from '../../../../../lib/supabase-server';

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

/**
 * MMR diversification: pick topK chunks that are relevant to the query
 * but diverse from each other. λ=0.5 balances relevance vs diversity.
 * Falls back to doc-level greedy diversity when embeddings are unavailable (RPC path).
 */
function mmrDiversify(candidates, queryEmbedding, topK = 10, lambda = 0.5) {
  if (candidates.length <= topK) return candidates;

  const hasEmbeddings = candidates.some(c => c._emb && c._emb.length > 0);

  if (!hasEmbeddings) {
    // Greedy doc-level diversity: one chunk per doc first, then fill remaining slots
    const seenDocs = new Set();
    const result = [];
    for (const c of candidates) {
      if (result.length >= topK) break;
      if (!seenDocs.has(c.doc_id)) { seenDocs.add(c.doc_id); result.push(c); }
    }
    for (const c of candidates) {
      if (result.length >= topK) break;
      if (!result.includes(c)) result.push(c);
    }
    return result.map(({ _fromRpc, ...rest }) => rest);
  }

  const selected = [];
  const remaining = [...candidates];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const relevance = c._emb ? cosineSimilarity(queryEmbedding, c._emb) : (c.score || 0);
      let maxSim = 0;
      for (const s of selected) {
        if (s._emb && c._emb) {
          const sim = cosineSimilarity(c._emb, s._emb);
          if (sim > maxSim) maxSim = sim;
        }
      }
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) { bestScore = mmrScore; bestIdx = i; }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected.map(({ _emb, _fromRpc, ...rest }) => rest);
}

/**
 * Generate 2 alternative phrasings of the question via a fast Groq call.
 * Returns [] on timeout (4s) or any error — fully graceful.
 */
async function generateQueryVariants(question) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Generate exactly 2 alternative phrasings of this research question. Return ONLY a JSON array of 2 strings, no explanation.\nQuestion: "${question}"\nExample output: ["alternative 1", "alternative 2"]`,
        }],
        temperature: 0.7,
        max_tokens: 120,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return [];

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const variants = JSON.parse(match[0]);
    if (!Array.isArray(variants)) return [];
    return variants
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.trim().slice(0, 200))
      .slice(0, 2);
  } catch {
    return [];
  }
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
    if (!error && data && data.length > 0) return data.map(d => ({ ...d, _fromRpc: true }));
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

    // Multi-query expansion: generate variants + embed all in parallel
    const variants = await generateQueryVariants(question);
    const allQueries = [question, ...variants];
    const embeddings = await Promise.all(allQueries.map(q => embedQuery(q)));
    const queryEmbedding = embeddings[0]; // primary embedding

    // Search for each query variant concurrently
    const perQueryK = variants.length > 0 ? 12 : 20;
    const allCandidateSets = await Promise.all(
      allQueries.map((q, i) =>
        searchChunks(supabase, id, q, embeddings[i], perQueryK,
          intent.keywordWeight, intent.vectorWeight)
      )
    );

    // Merge all candidate sets, dedup by chunk id, keep highest score per id
    const candidateMap = new Map();
    for (const set of allCandidateSets) {
      for (const chunk of set) {
        const existing = candidateMap.get(chunk.id);
        if (!existing || (chunk.score || 0) > (existing.score || 0)) {
          // Parse and cache embedding for MMR use
          if (!chunk._fromRpc && chunk.embedding) {
            chunk._emb = typeof chunk.embedding === 'string'
              ? chunk.embedding.replace(/[\[\]]/g, '').split(',').map(Number)
              : chunk.embedding;
          }
          candidateMap.set(chunk.id, chunk);
        }
      }
    }

    const mergedCandidates = Array.from(candidateMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 30);

    const chunks = mmrDiversify(mergedCandidates, queryEmbedding, 10, 0.5);

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

    // Sort chunks by document then chunk_index for narrative continuity
    const sortedChunks = [...chunks].sort((a, b) => {
      const docA = a.doc_id || a.doc_title || '';
      const docB = b.doc_id || b.doc_title || '';
      if (docA !== docB) return docA.localeCompare(docB);
      return (a.chunk_index ?? 0) - (b.chunk_index ?? 0);
    });

    // Merge consecutive chunks from the same document into single passages
    const groups = [];
    for (const chunk of sortedChunks) {
      const last = groups[groups.length - 1];
      const sameDoc = last && last.doc_id === chunk.doc_id;
      const consecutive = sameDoc && (chunk.chunk_index ?? 0) === (last.lastIndex ?? 0) + 1;
      if (consecutive) {
        last.text += ' ' + chunk.text;
        last.lastIndex = chunk.chunk_index;
      } else {
        groups.push({ doc_id: chunk.doc_id, doc_title: chunk.doc_title, year: chunk.year, text: chunk.text, lastIndex: chunk.chunk_index ?? 0 });
      }
    }

    const contextText = groups.map((g) => {
      const citation = `[[${g.doc_title || g.doc_id || 'Untitled'}${g.year ? ` (${g.year})` : ''}]]`;
      return `${citation}\n${g.text}`;
    }).join('\n\n---\n\n');

    const contextPartialNote = chunks.length < 5
      ? '\nNote: Only a small number of relevant passages were found. Acknowledge gaps explicitly and do not extrapolate.'
      : '';

    const systemPrompt = `You are a precise research assistant for the "${dataset.name}" dataset. Answer questions strictly from the provided context passages.

RULES:
1. Cite every factual claim with [[Title (Year)]] inline, using the exact title from the passage header.
2. If multiple passages support a point, cite all of them: [[A (2020)]] [[B (2021)]].
3. If the context contains partial information, synthesize what IS available, then explicitly state what is missing or uncertain.
4. Do NOT infer, extrapolate, or use outside knowledge. If a fact is not in the context, say: "The provided dataset does not contain this information."
5. For count or aggregate questions, use the DATASET AGGREGATE STATISTICS block — those numbers are authoritative. Do not count from the context passages.
6. Keep answers concise: prefer bullet points for lists, prose for explanations.
7. If asked about a specific named item, describe every attribute the context provides for it.${contextPartialNote}
${statsBlock}
CONTEXT PASSAGES (grouped by source document):
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
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq error:', groqResponse.status, errText);
      return Response.json({ error: 'AI service error' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const capturedChunks = chunks;
    const capturedIntent = intent;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = '';
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content ?? '';
                if (token) {
                  fullAnswer += token;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                }
              } catch {}
            }
          }

          const sourceMatches = fullAnswer.match(/\[\[([^\]]+)\]\]/g);
          const sources = sourceMatches ? sourceMatches.map((m) => m.slice(2, -2)) : [];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            metadata: {
              sources_cited: sources,
              chunks_used: capturedChunks.length,
              model: 'llama-3.3-70b-versatile',
              intent: { isCountQuery: capturedIntent.isCountQuery, isExactNameQuery: capturedIntent.isExactNameQuery },
            }
          })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    return Response.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
