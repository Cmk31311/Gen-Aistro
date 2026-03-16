import fs from 'fs';
import path from 'path';

let papersCache = null;

function loadPapers() {
  if (papersCache) return papersCache;
  const filePath = path.join(process.cwd(), 'public/data/papers.json');
  papersCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return papersCache;
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

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const papers = loadPapers();

    // Get this paper's chunks (text only, no embedding)
    const ownChunks = papers.filter(c => c.doc_id === id);
    if (ownChunks.length === 0) {
      return Response.json({ error: 'Publication not found' }, { status: 404 });
    }

    // Compute related papers using first-chunk embedding similarity (server-side only)
    const queryEmbedding = ownChunks[0]?.embedding;
    let similarPapers = [];

    if (queryEmbedding && Array.isArray(queryEmbedding)) {
      // Build one representative embedding per doc (first chunk)
      const docMap = new Map();
      for (const chunk of papers) {
        if (!docMap.has(chunk.doc_id) && chunk.embedding && Array.isArray(chunk.embedding)) {
          docMap.set(chunk.doc_id, {
            id: chunk.doc_id,
            title: chunk.doc_title,
            url: chunk.url,
            year: chunk.year,
            embedding: chunk.embedding,
          });
        }
      }

      similarPapers = Array.from(docMap.values())
        .filter(p => p.id !== id)
        .map(p => ({ id: p.id, title: p.title, url: p.url, year: p.year, similarity: cosineSimilarity(queryEmbedding, p.embedding) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
    }

    // Return text chunks without embeddings (much smaller payload)
    const safeChunks = ownChunks.map(({ embedding: _e, ...rest }) => rest);

    return Response.json({ chunks: safeChunks, similarPapers });
  } catch (error) {
    console.error('Paper detail API error:', error);
    return Response.json({ error: 'Failed to load paper' }, { status: 500 });
  }
}
