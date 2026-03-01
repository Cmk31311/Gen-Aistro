
// Cache the pipeline so the model loads only once
let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model (first request may be slow)...');
    const { pipeline } = await import('@huggingface/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'fp32',
    });
    console.log('Embedding model loaded');
  }
  return embedder;
}

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

    const extractor = await getEmbedder();
    const output = await extractor(text.trim(), { pooling: 'mean', normalize: true });

    // Convert to plain array
    const embedding = Array.from(output.data);

    if (embedding.length !== 384) {
      console.error('Unexpected embedding dimension:', embedding.length);
      return Response.json(
        { error: 'Unexpected embedding format from model' },
        { status: 500 }
      );
    }

    return Response.json({ embedding });

  } catch (error) {
    console.error('Embed API error:', error);
    return Response.json(
      { error: 'An error occurred while generating the embedding' },
      { status: 500 }
    );
  }
}
