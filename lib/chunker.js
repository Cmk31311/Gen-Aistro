/**
 * Split text into overlapping chunks that respect sentence and paragraph boundaries.
 *
 * - Target: maxWords per chunk (default 200, fits MiniLM-L6-v2's 256-token window)
 * - Boundaries: never splits mid-sentence; paragraph breaks always start a new chunk
 * - Overlap: last `overlapSentences` sentence(s) of each chunk carry into the next
 *
 * @param {string} text
 * @param {number} maxWords - target max words per chunk (default 200)
 * @param {number} overlapSentences - sentences to repeat at start of next chunk (default 1)
 * @returns {{ text: string, chunk_index: number }[]}
 */
export function chunkText(text, maxWords = 200, overlapSentences = 1) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const wordLen = (s) => s.split(/\s+/).filter(Boolean).length;

  // Split into paragraphs on blank lines
  const paragraphs = trimmed.split(/\n{2,}/);

  // Build a flat list of sentences with null markers between paragraphs
  const sentences = [];
  for (const para of paragraphs) {
    const raw = para.trim();
    if (!raw) continue;
    // Split on sentence-ending punctuation followed by whitespace
    const parts = raw.split(/(?<=[.?!])\s+/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
    // Paragraph boundary — signals a hard flush
    sentences.push(null);
  }

  const chunks = [];
  let current = []; // sentences accumulating in the current chunk
  let wordCount = 0;

  const flush = (hard = false) => {
    if (current.length === 0) return;
    chunks.push({ text: current.join(' '), chunk_index: chunks.length });
    if (hard) {
      current = [];
      wordCount = 0;
    } else {
      // Soft flush: carry last N sentences as overlap into next chunk
      const keep = current.slice(-overlapSentences);
      current = keep;
      wordCount = keep.reduce((sum, s) => sum + wordLen(s), 0);
    }
  };

  for (const sentence of sentences) {
    // Paragraph boundary — hard flush, no overlap
    if (sentence === null) {
      flush(true);
      continue;
    }

    const sentWords = wordLen(sentence);

    // If adding this sentence would exceed the limit and we have content, soft-flush first
    if (wordCount + sentWords > maxWords && current.length > 0) {
      flush(false);
    }

    current.push(sentence);
    wordCount += sentWords;

    // If a single sentence is itself over the limit, emit it immediately (hard flush)
    if (wordCount > maxWords) {
      flush(true);
    }
  }

  // Flush any remaining content
  if (current.length > 0) {
    chunks.push({ text: current.join(' '), chunk_index: chunks.length });
  }

  return chunks;
}
