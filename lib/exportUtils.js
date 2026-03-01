function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(papers) {
  const headers = ['Title', 'Document ID', 'URL', 'Year'];
  const rows = papers.map(p => [
    `"${(p.title || p.doc_title || '').replace(/"/g, '""')}"`,
    p.id || p.doc_id || '',
    p.url || '',
    p.year || ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, 'genaistro-publications.csv', 'text/csv');
}

export function exportToBibTeX(papers) {
  const entries = papers.map((p, i) => {
    const key = (p.id || p.doc_id || `paper${i}`).replace(/[^a-zA-Z0-9]/g, '');
    const title = p.title || p.doc_title || 'Untitled';
    return `@article{${key},
  title = {${title}},
  year = {${p.year || 'n.d.'}},
  url = {${p.url || ''}},
  note = {NASA Space Biology Research}
}`;
  });
  downloadFile(entries.join('\n\n'), 'genaistro-publications.bib', 'text/plain');
}

export function exportSearchResults(query, answer, sources) {
  const lines = [
    `Search Query: ${query}`,
    '',
    'AI Answer:',
    answer,
    '',
    'Sources:',
    ...sources.map((s, i) => `${i + 1}. ${s.doc_title || 'Untitled'} (Score: ${(s.score * 100).toFixed(1)}%) ${s.url || ''}`)
  ];
  downloadFile(lines.join('\n'), 'genaistro-search-results.txt', 'text/plain');
}

export function generateBibTeXCitation(source) {
  const key = (source.doc_id || 'paper').replace(/[^a-zA-Z0-9]/g, '');
  const title = source.doc_title || 'Untitled';
  const year = source.year || new Date().getFullYear();
  return `@article{${key},
  title = {${title}},
  year = {${year}},
  url = {${source.url || ''}},
  note = {NASA Space Biology Research}
}`;
}
