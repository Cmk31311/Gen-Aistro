
export async function POST(req) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    if (question.length > 3000) {
      return Response.json({ error: 'Question too long (max 3000 characters)' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are a research decomposition assistant. Given a complex research question, break it into 3-5 focused sub-queries that can each be searched independently in a NASA Space Biology research corpus.

RULES:
1. Each sub-query should target a specific aspect of the original question.
2. Sub-queries should be self-contained search queries (not questions).
3. Cover different angles: methodology, organisms, findings, mechanisms, comparisons.
4. Output ONLY a JSON array of strings. No explanation, no markdown.

QUESTION: ${question}

OUTPUT (JSON array only):`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq decompose error:', response.status, errorText);
      return Response.json({ error: 'Failed to decompose question' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON array from response
    let subQueries;
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        subQueries = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch {
      // Fallback: split by newlines and clean up
      subQueries = content
        .split('\n')
        .map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(line => line.length > 10);
    }

    // Ensure 3-5 sub-queries
    if (!Array.isArray(subQueries) || subQueries.length < 2) {
      subQueries = [question]; // Fallback to original question
    }
    subQueries = subQueries.slice(0, 5);

    return Response.json({ sub_queries: subQueries });

  } catch (error) {
    console.error('Decompose API error:', error);
    return Response.json({ error: 'Failed to decompose question' }, { status: 500 });
  }
}
