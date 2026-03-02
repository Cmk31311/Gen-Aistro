import fs from 'fs';
import path from 'path';

// Shared cache with search route (same data)
let papersCache = null;
let metadataCache = null;

function loadPapers() {
  if (papersCache) return papersCache;

  const filePath = path.join(process.cwd(), 'public/data/papers.json');
  papersCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return papersCache;
}

function getMetadata() {
  if (metadataCache) return metadataCache;

  const papers = loadPapers();

  // Group by doc_id and extract metadata (no embeddings, no full text)
  const docMap = new Map();
  for (const chunk of papers) {
    if (!docMap.has(chunk.doc_id)) {
      docMap.set(chunk.doc_id, {
        id: chunk.doc_id,
        title: chunk.doc_title,
        url: chunk.url,
        year: chunk.year,
        chunkCount: 1
      });
    } else {
      docMap.get(chunk.doc_id).chunkCount++;
    }
  }

  metadataCache = Array.from(docMap.values());
  return metadataCache;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    let publications = getMetadata();

    // Apply search filter
    if (search) {
      publications = publications.filter(p =>
        p.title.toLowerCase().includes(search) ||
        (p.id && p.id.toLowerCase().includes(search))
      );
    }

    const total = publications.length;
    const start = page * limit;
    const paged = publications.slice(start, start + limit);

    return Response.json({
      publications: paged,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Papers API error:', error);
    return Response.json(
      { error: 'Failed to load papers', publications: [], total: 0 },
      { status: 500 }
    );
  }
}
