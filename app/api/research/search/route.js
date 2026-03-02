
import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from '../../../../utils/cosine';

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

let papersCache = null;

function loadPapers() {
  if (papersCache) return papersCache;
  const filePath = path.join(process.cwd(), 'public/data/papers.json');
  papersCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return papersCache;
}

async function embedText(text) {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
    },
    body: JSON.stringify({
      inputs: text.trim(),
      options: { wait_for_model: true }
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const embedding = await response.json();

  // Mean pool if nested array
  let vector = embedding;
  if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
    const tokenCount = embedding.length;
    vector = new Array(embedding[0].length).fill(0);
    for (let i = 0; i < tokenCount; i++) {
      for (let j = 0; j < embedding[i].length; j++) {
        vector[j] += embedding[i][j];
      }
    }
    for (let j = 0; j < vector.length; j++) {
      vector[j] /= tokenCount;
    }
  }

  return vector;
}

export async function POST(req) {
  try {
    const { sub_queries } = await req.json();

    if (!sub_queries || !Array.isArray(sub_queries) || sub_queries.length === 0) {
      return Response.json({ error: 'sub_queries array is required' }, { status: 400 });
    }

    if (sub_queries.length > 5) {
      return Response.json({ error: 'Maximum 5 sub-queries allowed' }, { status: 400 });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      return Response.json({ error: 'HuggingFace API key not configured' }, { status: 500 });
    }

    const papers = loadPapers();
    const resultsByQuery = {};
    const allChunkIds = new Set();
    const allChunks = [];

    for (const query of sub_queries) {
      try {
        const embedding = await embedText(query);

        // Search corpus
        const scored = papers.map(paper => ({
          doc_id: paper.doc_id,
          doc_title: paper.doc_title,
          year: paper.year,
          url: paper.url,
          chunk_id: paper.chunk_id,
          text: paper.text,
          score: cosineSimilarity(embedding, paper.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);
        const topResults = scored.slice(0, 8);

        resultsByQuery[query] = topResults;

        // Deduplicate across all queries
        for (const result of topResults) {
          const id = result.chunk_id || `${result.doc_id}_${result.text.substring(0, 50)}`;
          if (!allChunkIds.has(id)) {
            allChunkIds.add(id);
            allChunks.push(result);
          }
        }
      } catch (err) {
        console.error(`Search failed for sub-query "${query}":`, err.message);
        resultsByQuery[query] = [];
      }
    }

    // Sort all deduplicated chunks by score and take top 15
    allChunks.sort((a, b) => b.score - a.score);
    const topChunks = allChunks.slice(0, 15);

    // Count unique papers
    const uniquePapers = new Set(topChunks.map(c => c.doc_id));

    return Response.json({
      results_by_query: resultsByQuery,
      merged_chunks: topChunks,
      total_unique_papers: uniquePapers.size,
      total_chunks: topChunks.length
    });

  } catch (error) {
    console.error('Research search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
