// Client-side embedding that calls our server-side API
// The API uses the same model (all-MiniLM-L6-v2) that was used to embed the documents

const MAX_QUERY_LENGTH = 1000;
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 50;

export async function embedQuery(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }
  if (text.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long (max ${MAX_QUERY_LENGTH} characters)`);
  }

  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  if (embeddingCache.has(cacheKey)) {
    console.log('Embedding cache hit');
    return embeddingCache.get(cacheKey);
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating embedding (attempt ${attempt}):`, text.substring(0, 50) + '...');

      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (response.status === 503) {
        // Model is loading on HuggingFace, wait and retry
        console.log('Model is loading, retrying in', RETRY_DELAY, 'ms...');
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Embedding API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.embedding || data.embedding.length !== 384) {
        throw new Error('Invalid embedding received from API');
      }

      console.log('Embedding generated:', data.embedding.length, 'dimensions');

      // Store in cache
      if (embeddingCache.size >= MAX_CACHE_SIZE) {
        embeddingCache.delete(embeddingCache.keys().next().value);
      }
      embeddingCache.set(cacheKey, data.embedding);

      return data.embedding;

    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error('Embedding error after all retries:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
      console.warn(`Attempt ${attempt} failed, retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}
