import { extractOrganismStats } from './paperUtils';

export function generateInsights(publications, stats, graphData) {
  const insights = [];

  // 1. Corpus overview
  insights.push({
    id: 'corpus-size',
    title: `${publications.length} Publications Analyzed`,
    type: 'overview',
    description: `The NASA Space Biology corpus contains ${publications.length} unique publications with ${stats?.total_chunks || 'thousands of'} text chunks, representing decades of space biology research.`,
    impact: 'high',
    confidence: 1.0,
    data: { publications: publications.length, chunks: stats?.total_chunks || 0 }
  });

  // 2. Top research topic
  if (stats?.top_keywords?.length > 0) {
    const top = stats.top_keywords[0];
    const topTerms = stats.top_keywords.slice(0, 5).map(k => k.term).join(', ');
    insights.push({
      id: 'top-topic',
      title: `"${top.term}" Dominates Research`,
      type: 'trend',
      description: `"${top.term}" is the most prominent term across all publications with a TF-IDF score of ${(top.score * 100).toFixed(1)}%. The top 5 research terms are: ${topTerms}.`,
      impact: 'high',
      confidence: 0.95,
      data: stats.top_keywords.slice(0, 10).reduce((acc, k) => { acc[k.term] = (k.score * 100).toFixed(2) + '%'; return acc; }, {})
    });
  }

  // 3. Organism distribution
  const organismStats = extractOrganismStats(publications);
  const sortedOrganisms = Object.entries(organismStats).sort(([, a], [, b]) => b - a);
  if (sortedOrganisms.length > 0) {
    const [topOrg, topCount] = sortedOrganisms[0];
    const pct = ((topCount / publications.length) * 100).toFixed(1);
    insights.push({
      id: 'top-organism',
      title: `${topOrg}: Most Studied Organism`,
      type: 'organism',
      description: `${topOrg} appears in ${topCount} publications (${pct}% of the corpus), making it the most studied organism in NASA Space Biology research. ${sortedOrganisms.length} different organisms are represented across the dataset.`,
      impact: 'medium',
      confidence: 0.90,
      data: Object.fromEntries(sortedOrganisms)
    });
  }

  // 4. Link coverage
  const withLinks = publications.filter(p => p.url).length;
  const coverage = ((withLinks / publications.length) * 100).toFixed(1);
  insights.push({
    id: 'link-coverage',
    title: `${coverage}% Publication Link Coverage`,
    type: 'data-quality',
    description: `${withLinks} out of ${publications.length} publications have direct web links available for full-text access. ${coverage > 80 ? 'The dataset has excellent link coverage.' : 'Some publications may require alternative access methods.'}`,
    impact: coverage > 80 ? 'low' : 'medium',
    confidence: 1.0,
    data: { with_links: withLinks, total: publications.length, coverage: coverage + '%' }
  });

  // 5. Knowledge graph density
  if (graphData?.nodes?.length > 0) {
    const n = graphData.nodes.length;
    const l = graphData.links.length;
    const maxLinks = (n * (n - 1)) / 2;
    const density = ((l / maxLinks) * 100).toFixed(1);

    const organisms = graphData.nodes.filter(n => n.type === 'organism').length;
    const conditions = graphData.nodes.filter(n => n.type === 'condition').length;
    const outcomes = graphData.nodes.filter(n => n.type === 'outcome').length;

    insights.push({
      id: 'knowledge-graph',
      title: 'Rich Research Network',
      type: 'network',
      description: `The knowledge graph maps ${n} entities (${organisms} organisms, ${conditions} conditions, ${outcomes} outcomes) with ${l} relationships. Network density is ${density}%, indicating ${density > 30 ? 'a highly interconnected' : 'a moderately connected'} research landscape.`,
      impact: 'high',
      confidence: 0.88,
      data: { nodes: n, links: l, density: density + '%', organisms, conditions, outcomes }
    });
  }

  // 6. Research diversity from keywords
  if (stats?.top_keywords?.length >= 10) {
    const categories = {
      'Biological Systems': ['cell', 'cells', 'bone', 'muscle', 'plant', 'expression'],
      'Space Environment': ['spaceflight', 'space', 'microgravity', 'radiation', 'station'],
      'Research Focus': ['effects', 'response', 'stress', 'mouse', 'mice', 'arabidopsis']
    };
    const categoryScores = {};
    Object.entries(categories).forEach(([cat, terms]) => {
      const matches = stats.top_keywords.filter(k => terms.includes(k.term));
      categoryScores[cat] = matches.reduce((sum, k) => sum + k.score, 0);
    });
    const topCategory = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0];
    insights.push({
      id: 'research-diversity',
      title: 'Multi-Disciplinary Research Landscape',
      type: 'trend',
      description: `Research spans multiple categories with "${topCategory[0]}" being the strongest theme (score: ${(topCategory[1] * 100).toFixed(1)}%). The corpus covers biological systems, space environment effects, and diverse research methodologies.`,
      impact: 'medium',
      confidence: 0.85,
      data: Object.fromEntries(Object.entries(categoryScores).map(([k, v]) => [k, (v * 100).toFixed(2) + '%']))
    });
  }

  // 7. Content richness
  const avgChunks = publications.reduce((sum, p) => sum + (p.chunks?.length || 0), 0) / publications.length;
  insights.push({
    id: 'content-depth',
    title: `${avgChunks.toFixed(1)} Avg. Chunks per Paper`,
    type: 'data-quality',
    description: `Each publication averages ${avgChunks.toFixed(1)} text chunks, indicating ${avgChunks > 8 ? 'rich, detailed content suitable for deep analysis' : 'moderate content depth for targeted queries'}. The semantic search can draw from this rich text corpus for comprehensive answers.`,
    impact: 'low',
    confidence: 0.92,
    data: { avg_chunks: avgChunks.toFixed(1), total_chunks: stats?.total_chunks || 0, publications: publications.length }
  });

  return insights;
}
