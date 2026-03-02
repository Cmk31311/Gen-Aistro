
import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from '../../../../utils/cosine';

let papersCache = null;

function loadPapers() {
  if (papersCache) return papersCache;
  const filePath = path.join(process.cwd(), 'public/data/papers.json');
  papersCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return papersCache;
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

    const papers = loadPapers();
    const resultsByQuery = {};
    const allChunkIds = new Set();
    const allChunks = [];

    for (const query of sub_queries) {
      // Embed each sub-query via our embed API
      const embedResponse = await fetch(new URL('/api/embed', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });

      if (!embedResponse.ok) {
        console.error(`Embedding failed for query: ${query}`);
        resultsByQuery[query] = [];
        continue;
      }

      const { embedding } = await embedResponse.json();

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

      resultsByQuery[query] = topResults.map(({ ...rest }) => rest);

      // Deduplicate across all queries
      for (const result of topResults) {
        const id = result.chunk_id || `${result.doc_id}_${result.text.substring(0, 50)}`;
        if (!allChunkIds.has(id)) {
          allChunkIds.add(id);
          allChunks.push(result);
        }
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
