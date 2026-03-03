/**
 * Split text into overlapping chunks of ~maxWords words.
 * Returns array of { text, chunk_index }.
 */
export function chunkText(text, maxWords = 500, overlap = 50) {
  if (!text || typeof text !== 'string') return [];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // If text fits in one chunk, return it directly
  if (words.length <= maxWords) {
    return [{ text: words.join(' '), chunk_index: 0 }];
  }

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const chunkWords = words.slice(start, end);
    chunks.push({
      text: chunkWords.join(' '),
      chunk_index: chunks.length,
    });

    if (end >= words.length) break;
    start = end - overlap;
  }

  return chunks;
}
