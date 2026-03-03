/**
 * Auto-detect column roles from CSV header names.
 * Returns { text, title, year, url, doc_id } mapping column names.
 */
export function detectColumns(headers) {
  const lower = headers.map(h => h.toLowerCase().trim());
  const mapping = { text: null, title: null, year: null, url: null, doc_id: null };

  const patterns = {
    text: ['abstract', 'text', 'content', 'body', 'description', 'summary', 'fulltext', 'full_text'],
    title: ['title', 'name', 'paper_title', 'article_title', 'heading'],
    year: ['year', 'date', 'pub_year', 'publication_year', 'published'],
    url: ['url', 'link', 'doi', 'uri', 'href', 'source_url'],
    doc_id: ['doc_id', 'id', 'paper_id', 'article_id', 'pmid', 'document_id'],
  };

  for (const [role, keywords] of Object.entries(patterns)) {
    for (const kw of keywords) {
      const idx = lower.findIndex(h => h === kw || h.replace(/[_\-\s]/g, '') === kw.replace(/[_\-\s]/g, ''));
      if (idx !== -1) {
        mapping[role] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}
