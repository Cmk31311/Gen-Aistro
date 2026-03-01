
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return Response.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (text.trim().length > 1000) {
      return Response.json(
        { error: 'Text too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Call HuggingFace Inference API (free, no key required for public models)
    // If you have an HF token, set HUGGINGFACE_API_KEY in .env for higher rate limits
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.HUGGINGFACE_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.HUGGINGFACE_API_KEY}`;
    }

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: text.trim(),
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API error:', response.status, errorText);

      if (response.status === 503) {
        // Model is loading, tell client to retry
        return Response.json(
          { error: 'Embedding model is loading. Please try again in a few seconds.', retry: true },
          { status: 503 }
        );
      }

      return Response.json(
        { error: 'Failed to generate embedding' },
        { status: 500 }
      );
    }

    const embedding = await response.json();

    // HuggingFace returns the embedding directly as an array of 384 numbers
    // For sentence-transformers, it returns a nested array - we need the first element
    let vector = embedding;
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      // Mean pooling: average all token embeddings to get sentence embedding
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

    if (!Array.isArray(vector) || vector.length !== 384) {
      console.error('Unexpected embedding shape:', typeof vector, Array.isArray(vector) ? vector.length : 'not array');
      return Response.json(
        { error: 'Unexpected embedding format from model' },
        { status: 500 }
      );
    }

    return Response.json({ embedding: vector });

  } catch (error) {
    console.error('Embed API error:', error);
    return Response.json(
      { error: 'An error occurred while generating the embedding' },
      { status: 500 }
    );
  }
}
