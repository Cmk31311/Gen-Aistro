import { ORGANISM_PATTERNS } from './constants';

export function groupChunksByDocId(chunks) {
  const map = new Map();
  chunks.forEach(chunk => {
    if (!map.has(chunk.doc_id)) {
      map.set(chunk.doc_id, {
        id: chunk.doc_id,
        title: chunk.doc_title || 'Untitled',
        year: chunk.year,
        url: chunk.url || '',
        type: 'publication',
        chunks: []
      });
    }
    map.get(chunk.doc_id).chunks.push({
      chunk_id: chunk.chunk_id,
      text: chunk.text,
      embedding: chunk.embedding
    });
  });
  return Array.from(map.values());
}

export function extractOrganismStats(publications) {
  const stats = {};
  publications.forEach(pub => {
    const searchText = pub.title.toLowerCase() + ' ' + (pub.chunks?.[0]?.text || '').toLowerCase();
    Object.entries(ORGANISM_PATTERNS).forEach(([name, regex]) => {
      if (regex.test(searchText)) {
        stats[name] = (stats[name] || 0) + 1;
      }
    });
  });
  return stats;
}

export function filterPublicationsByTerm(publications, term) {
  const regex = new RegExp(term, 'i');
  return publications.filter(pub => {
    const searchText = pub.title + ' ' + (pub.chunks?.[0]?.text || '');
    return regex.test(searchText);
  });
}

export function getPublicationAbstract(publication) {
  if (!publication.chunks || publication.chunks.length === 0) return '';
  return publication.chunks[0].text.substring(0, 500);
}

export function extractKeyTerms(text) {
  const terms = new Set();
  Object.entries(ORGANISM_PATTERNS).forEach(([name, regex]) => {
    if (regex.test(text)) terms.add(name);
  });
  const topicPatterns = {
    'Microgravity': /microgravity/i,
    'Radiation': /radiation/i,
    'Gene Expression': /gene\s*expression/i,
    'Bone Loss': /bone\s*(loss|density)/i,
    'Muscle Atrophy': /muscle\s*atrophy/i,
    'Spaceflight': /spaceflight|space\s*flight/i,
    'Immune System': /immune/i,
    'Circadian Rhythm': /circadian/i,
    'Plant Growth': /plant\s*growth/i,
    'Cell Biology': /cell\s*(biology|cycle|division)/i
  };
  Object.entries(topicPatterns).forEach(([name, regex]) => {
    if (regex.test(text)) terms.add(name);
  });
  return Array.from(terms);
}
