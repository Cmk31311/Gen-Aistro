
// Rate limiting (simple in-memory store)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, timestamp] of rateLimitStore.entries()) {
    if (timestamp < windowStart) {
      rateLimitStore.delete(key);
    }
  }
  
  // Check current IP
  const requests = Array.from(rateLimitStore.entries())
    .filter(([key, timestamp]) => key.startsWith(ip) && timestamp >= windowStart);
  
  return requests.length < RATE_LIMIT_MAX_REQUESTS;
}

function addRateLimit(ip) {
  const now = Date.now();
  const key = `${ip}_${now}`;
  rateLimitStore.set(key, now);
}

async function searchWeb(query) {
  try {
    // Use DuckDuckGo Instant Answer API for web search
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract relevant information from DuckDuckGo response
    let webContext = '';
    
    if (data.Abstract) {
      webContext += `Abstract: ${data.Abstract}\n\n`;
    }
    
    if (data.Definition) {
      webContext += `Definition: ${data.Definition}\n\n`;
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      webContext += 'Related Information:\n';
      data.RelatedTopics.slice(0, 3).forEach((topic, index) => {
        if (topic.Text) {
          webContext += `${index + 1}. ${topic.Text}\n`;
        }
      });
    }
    
    return webContext.trim();
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}

function buildPrompt(question, chunks, temperature = 0.2, maxTokens = 800, webContext = null) {
  // Build context from chunks with proper citations
  const contextText = chunks.map((chunk, index) => {
    const citation = `[[${chunk.doc_title}${chunk.year ? ` (${chunk.year})` : ''}]]`;
    return `${citation}\n${chunk.text}`;
  }).join('\n\n');

  // Calculate approximate token budget (rough estimate: 1 token ≈ 4 characters)
  const contextLength = contextText.length;
  const maxContextLength = Math.min(6000, maxTokens * 4 - 1000); // Reserve space for prompt and response
  
  let finalContext = contextText;
  if (contextLength > maxContextLength) {
    // Truncate context while preserving complete chunks
    let truncatedLength = 0;
    const truncatedChunks = [];
    
    for (const chunk of chunks) {
      const chunkWithCitation = `[[${chunk.doc_title}${chunk.year ? ` (${chunk.year})` : ''}]]\n${chunk.text}`;
      if (truncatedLength + chunkWithCitation.length > maxContextLength) {
        break;
      }
      truncatedChunks.push(chunk);
      truncatedLength += chunkWithCitation.length;
    }
    
    finalContext = truncatedChunks.map((chunk, index) => {
      const citation = `[[${chunk.doc_title}${chunk.year ? ` (${chunk.year})` : ''}]]`;
      return `${citation}\n${chunk.text}`;
    }).join('\n\n');
  }

  let prompt = `You are a knowledgeable assistant helping users explore NASA Space Biology research. Answer the user's question using the provided context from scientific publications.`;

  if (webContext) {
    prompt += `\n\nADDITIONAL WEB CONTEXT (use this when NASA research context is insufficient):
${webContext}`;
  }

  prompt += `\n\nCRITICAL INSTRUCTIONS:
1. Prioritize information from NASA Space Biology research publications.
2. If the NASA context is insufficient, supplement with web information.
3. Always cite sources using the format [[Title (Year)]] for NASA publications.
4. For web information, mention it as "web sources" or "general knowledge".
5. Be precise and scientific in your language.
6. Keep your answer concise but comprehensive.
7. If combining sources, clearly distinguish between NASA research and general knowledge.

NASA RESEARCH CONTEXT:
${finalContext}

QUESTION: ${question}

ANSWER:`;

  return prompt;
}

function validateInput(question, chunks, temperature, maxTokens) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new Error('Question is required and must be a non-empty string');
  }
  
  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('Chunks are required and must be a non-empty array');
  }
  
  // Validate chunk structure
  for (const chunk of chunks) {
    if (!chunk.text || !chunk.doc_title) {
      throw new Error('Each chunk must have text and doc_title');
    }
  }
  
  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
    throw new Error('Temperature must be a number between 0 and 1');
  }
  
  if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 1000)) {
    throw new Error('Max tokens must be a number between 1 and 1000');
  }
}

async function checkContextSufficiency(question, chunks) {
  // Simple heuristic to check if context is sufficient
  const questionWords = question.toLowerCase().split(/\s+/);
  const contextText = chunks.map(chunk => chunk.text.toLowerCase()).join(' ');
  
  // Check for key terms in context
  let relevantTerms = 0;
  const importantWords = questionWords.filter(word => word.length > 3); // Skip short words
  
  for (const word of importantWords) {
    if (contextText.includes(word)) {
      relevantTerms++;
    }
  }
  
  // If less than 30% of important words are found in context, consider it insufficient
  const sufficiencyRatio = relevantTerms / Math.max(importantWords.length, 1);
  return sufficiencyRatio >= 0.3;
}

export async function POST(req) {
  try {
    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Add to rate limit
    addRateLimit(ip);
    
    const { question, chunks, temperature = 0.2, max_tokens = 800 } = await req.json();
    
    // Validate inputs
    validateInput(question, chunks, temperature, max_tokens);
    
    // Check for API key
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return Response.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Check if context is sufficient
    const isContextSufficient = await checkContextSufficiency(question, chunks);
    let webContext = null;
    let usedWebSearch = false;
    
    // If context is insufficient, search the web
    if (!isContextSufficient) {
      console.log('Context insufficient, searching web for:', question);
      webContext = await searchWeb(question);
      usedWebSearch = webContext !== null;
    }
    
    // Build prompt with optional web context
    const prompt = buildPrompt(question, chunks, temperature, max_tokens, webContext);
    
    // Prepare Groq API request
    const groqRequest = {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      max_tokens: Math.min(max_tokens, 1000), // Cap at 1000
      stream: false, // Start with non-streaming for simplicity
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
    
    // Call Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(groqRequest)
    });
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      
      if (groqResponse.status === 401) {
        return Response.json(
          { error: 'Invalid API key' },
          { status: 500 }
        );
      } else if (groqResponse.status === 429) {
        return Response.json(
          { error: 'Groq API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else {
        return Response.json(
          { error: 'Failed to generate response. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    const data = await groqResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid Groq response:', data);
      return Response.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }
    
    const answer = data.choices[0].message.content;
    
    // Extract sources from answer for metadata
    const sourceMatches = answer.match(/\[\[([^\]]+)\]\]/g);
    const sources = sourceMatches ? sourceMatches.map(match => match.slice(2, -2)) : [];
    
    return Response.json({
      answer: answer,
      metadata: {
        sources_cited: sources,
        chunks_used: chunks.length,
        temperature: temperature,
        max_tokens: max_tokens,
        model: "llama-3.3-70b-versatile",
        used_web_search: usedWebSearch,
        context_sufficient: isContextSufficient
      }
    });
    
  } catch (error) {
    console.error('Ask API error:', error);
    
    // Don't expose internal errors
    return Response.json(
      { 
        error: 'An error occurred while processing your request. Please try again.',
        answer: null
      },
      { status: 500 }
    );
  }
}
