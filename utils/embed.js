// Client-side embedding using a simple hash-based approach for testing
export async function embedQuery(text) {
  if (typeof window === 'undefined') {
    throw new Error('Embedding generation is only available in the browser');
  }

  try {
    console.log('Generating embedding for:', text.substring(0, 50) + '...');
    
    // Simple hash-based embedding for testing (384 dimensions)
    const embedding = new Array(384).fill(0);
    
    // Create a simple hash from the text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Distribute hash across embedding dimensions
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    
    console.log('Embedding generated:', embedding.length, 'dimensions');
    return embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}
