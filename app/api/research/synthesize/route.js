
export async function POST(req) {
  try {
    const { question, chunks, sub_queries } = await req.json();

    if (!question || !chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return Response.json({ error: 'Question and chunks are required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const contextText = chunks.map((chunk, i) => {
      const citation = `[${i + 1}] ${chunk.doc_title}${chunk.year ? ` (${chunk.year})` : ''}`;
      return `${citation}\n${chunk.text}`;
    }).join('\n\n');

    const sourceList = chunks.map((chunk, i) =>
      `[${i + 1}] ${chunk.doc_title}${chunk.year ? ` (${chunk.year})` : ''} — relevance: ${(chunk.score * 100).toFixed(1)}%`
    ).join('\n');

    const prompt = `You are an expert research analyst synthesizing findings from NASA Space Biology publications. Given a complex research question and evidence from multiple papers, produce a structured analysis report.

RESEARCH QUESTION: ${question}

SUB-QUERIES INVESTIGATED:
${(sub_queries || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}

EVIDENCE FROM ${chunks.length} SOURCES:
${contextText}

SOURCE LIST:
${sourceList}

INSTRUCTIONS:
Produce a JSON object with this exact structure:
{
  "overview": "A 2-3 sentence executive summary of the findings",
  "findings": [
    {
      "theme": "Theme name",
      "content": "Detailed finding with citations like [1], [2]",
      "source_indices": [1, 2]
    }
  ],
  "contradictions": "Any conflicting findings between papers, or 'No significant contradictions found' if none",
  "gaps": "Research gaps and unanswered questions identified from the literature",
  "sources_used": [
    {
      "index": 1,
      "title": "Paper title",
      "year": 2020,
      "relevance": 95.5
    }
  ]
}

RULES:
1. Group findings into 2-5 thematic categories
2. Always cite sources using [N] format matching the source list
3. Be specific and scientific — avoid vague language
4. Identify genuine contradictions if they exist
5. Note methodological differences that might explain discrepancies
6. Output ONLY the JSON object. No markdown, no explanation.

OUTPUT:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq synthesize error:', response.status, errorText);
      return Response.json({ error: 'Failed to synthesize report' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let report;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback: return raw content as overview
      report = {
        overview: content,
        findings: [],
        contradictions: 'Unable to parse structured report',
        gaps: '',
        sources_used: chunks.map((c, i) => ({
          index: i + 1,
          title: c.doc_title,
          year: c.year,
          relevance: +(c.score * 100).toFixed(1)
        }))
      };
    }

    // Ensure sources_used is populated even if AI missed it
    if (!report.sources_used || report.sources_used.length === 0) {
      report.sources_used = chunks.map((c, i) => ({
        index: i + 1,
        title: c.doc_title,
        year: c.year,
        relevance: +(c.score * 100).toFixed(1)
      }));
    }

    return Response.json({
      report,
      metadata: {
        total_papers_analyzed: chunks.length,
        sub_queries_count: sub_queries?.length || 0,
        model: 'llama-3.3-70b-versatile',
        unique_papers: new Set(chunks.map(c => c.doc_id)).size
      }
    });

  } catch (error) {
    console.error('Synthesize API error:', error);
    return Response.json({ error: 'Failed to synthesize report' }, { status: 500 });
  }
}
