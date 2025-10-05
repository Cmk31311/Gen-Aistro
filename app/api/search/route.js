
import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from '../../../utils/cosine';

// Cache for papers data (loaded once per cold start)
let papersCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function loadPapers() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (papersCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return papersCache;
  }
  
  try {
    const filePath = path.join(process.cwd(), 'public/data/papers.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    papersCache = data;
    cacheTimestamp = now;
    
    console.log(`✅ Loaded ${data.length} papers from cache`);
    return data;
  } catch (error) {
    console.error('Error loading papers:', error);
    throw new Error('Failed to load papers data');
  }
}

function applyFilters(papers, filter) {
  if (!filter) return papers;
  
  let filtered = papers;
  
  // Year range filter
  if (filter.year) {
    if (filter.year.min !== undefined) {
      filtered = filtered.filter(p => p.year && p.year >= filter.year.min);
    }
    if (filter.year.max !== undefined) {
      filtered = filtered.filter(p => p.year && p.year <= filter.year.max);
    }
  }
  
  // Keyword filters
  if (filter.keywords) {
    if (filter.keywords.include && filter.keywords.include.length > 0) {
      const includeTerms = filter.keywords.include.map(term => term.toLowerCase());
      filtered = filtered.filter(p => 
        includeTerms.some(term => 
          p.text.toLowerCase().includes(term) || 
          p.doc_title.toLowerCase().includes(term)
        )
      );
    }
    
    if (filter.keywords.exclude && filter.keywords.exclude.length > 0) {
      const excludeTerms = filter.keywords.exclude.map(term => term.toLowerCase());
      filtered = filtered.filter(p => 
        !excludeTerms.some(term => 
          p.text.toLowerCase().includes(term) || 
          p.doc_title.toLowerCase().includes(term)
        )
      );
    }
  }
  
  // Document ID filter
  if (filter.doc_ids && filter.doc_ids.length > 0) {
    filtered = filtered.filter(p => filter.doc_ids.includes(p.doc_id));
  }
  
  return filtered;
}

function mmrDiversification(results, queryEmbedding, lambda = 0.3, maxResults = 10) {
  if (results.length <= maxResults) return results;
  
  const selected = [];
  const remaining = [...results];
  
  // Select the first (highest scoring) result
  if (remaining.length > 0) {
    selected.push(remaining.shift());
  }
  
  // MMR selection for remaining slots
  while (selected.length < maxResults && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const relevanceScore = remaining[i].score;
      
      // Calculate max similarity to already selected items
      let maxSimilarity = 0;
      for (const selectedItem of selected) {
        const similarity = cosineSimilarity(remaining[i].embedding, selectedItem.embedding);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      // MMR score: λ * relevance - (1-λ) * max_similarity
      const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimilarity;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  
  return selected;
}

function validateInput(queryEmbedding, topK, filter) {
  // Validate embedding
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error('Invalid query embedding: must be an array');
  }
  
  if (queryEmbedding.length !== 384) {
    throw new Error(`Invalid embedding dimension: expected 384, got ${queryEmbedding.length}`);
  }
  
  // Validate topK
  if (topK && (typeof topK !== 'number' || topK < 1 || topK > 10)) {
    throw new Error('Invalid topK: must be a number between 1 and 10');
  }
  
  // Validate filter structure
  if (filter) {
    if (filter.year && (filter.year.min < 1950 || filter.year.max > 2030)) {
      throw new Error('Invalid year range: must be between 1950 and 2030');
    }
  }
}

export async function POST(req) {
  try {
    const { queryEmbedding, topK = 5, filter } = await req.json();
    
    // Validate inputs
    validateInput(queryEmbedding, topK, filter);
    
    // Load papers data
    const papers = loadPapers();
    
    // Apply filters
    const filteredPapers = applyFilters(papers, filter);
    
    if (filteredPapers.length === 0) {
      return Response.json({ 
        results: [], 
        metadata: { 
          total_chunks: papers.length, 
          filtered_chunks: 0,
          filter_applied: !!filter 
        } 
      });
    }
    
    // Compute similarities
    const similarities = filteredPapers.map(paper => ({
      doc_id: paper.doc_id,
      doc_title: paper.doc_title,
      year: paper.year,
      url: paper.url,
      chunk_id: paper.chunk_id,
      text: paper.text,
      embedding: paper.embedding,
      score: cosineSimilarity(queryEmbedding, paper.embedding)
    }));
    
    // Sort by similarity score
    similarities.sort((a, b) => b.score - a.score);
    
    // Apply MMR diversification
    const diversifiedResults = mmrDiversification(similarities, queryEmbedding, 0.3, topK);
    
    // Remove embeddings from response to reduce payload size
    const results = diversifiedResults.map(({ embedding, ...rest }) => rest);
    
    const response = {
      results,
      metadata: {
        total_chunks: papers.length,
        filtered_chunks: filteredPapers.length,
        returned_chunks: results.length,
        filter_applied: !!filter,
        mmr_diversification: true
      }
    };
    
    return Response.json(response);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    return Response.json(
      { 
        error: error.message || 'Internal server error',
        results: [],
        metadata: { error: true }
      },
      { status: error.message.includes('Invalid') ? 400 : 500 }
    );
  }
}
