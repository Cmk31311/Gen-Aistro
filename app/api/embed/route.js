
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

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

    if (!process.env.HUGGINGFACE_API_KEY) {
      return Response.json(
        { error: 'HUGGINGFACE_API_KEY is not configured' },
        { status: 500 }
      );
    }

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
      const errorText = await response.text();
      console.error('HuggingFace API error:', response.status, errorText);

      if (response.status === 503) {
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

    // HuggingFace returns per-token embeddings as nested array — mean pool them
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
