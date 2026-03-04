import { createServerClient } from '../../../../../lib/supabase';

const STOP_WORDS = new Set([
  'the','and','for','are','was','with','that','this','from','have','been',
  'will','about','into','over','after','also','than','more','some','when',
  'where','which','their','there','would','could','should','other','these',
  'those','they','them','then','were','being','each','make','like','just',
  'know','take','come','made','find','here','many','most','very','only',
  'your','used','using','such','between','what','how','does','not','but',
  'can','had','has','its','may','new','one','two','our','out','who','all',
  'she','her','his','him','did','get','got','let','say','see','way','too',
  'any','few','now','old','big','end','far','set','try','ask','own','why',
  'put','run','use','ago','add','age','air','yet','day','man','men','per',
  'data','study','results','research','however','found','showed','show',
  'figure','table','based','include','included','including','well','high',
  'low','significant','significantly','compared','different','similar',
  'total','number','group','level','effect','effects','type','types',
  'value','values','case','cases','time','times','year','years','first',
  'second','third','analysis','method','methods','model','system','part',
]);

function extractTopTerms(texts, topN = 15) {
  const freq = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const seen = new Set();
    for (const w of words) {
      if (w.length < 4 || STOP_WORDS.has(w) || /^\d+$/.test(w)) continue;
      if (!seen.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
        seen.add(w);
      }
    }
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total = texts.length || 1;
  return sorted.slice(0, topN).map(([term, count]) => ({
    term,
    count,
    pct: Math.round((count / total) * 100),
  }));
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: dataset } = await supabase
      .from('datasets')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!dataset || dataset.user_id !== user.id) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Total chunks
    const { count: totalChunks } = await supabase
      .from('chunks')
      .select('id', { count: 'exact', head: true })
      .eq('dataset_id', id);

    // Distinct documents
    const { data: docs } = await supabase
      .from('chunks')
      .select('doc_id')
      .eq('dataset_id', id);

    const uniqueDocs = new Set((docs || []).map(d => d.doc_id).filter(Boolean));
    const totalDocs = uniqueDocs.size || (docs || []).length;

    // Year distribution
    const { data: yearData } = await supabase
      .from('chunks')
      .select('year')
      .eq('dataset_id', id)
      .not('year', 'is', null);

    const yearCounts = {};
    for (const row of (yearData || [])) {
      if (row.year) {
        // Count distinct doc_ids per year for better stats
        yearCounts[row.year] = (yearCounts[row.year] || 0) + 1;
      }
    }
    const yearDistribution = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    // Top terms (sample 200 chunks)
    const { data: sampleChunks } = await supabase
      .from('chunks')
      .select('text')
      .eq('dataset_id', id)
      .limit(200);

    const topTerms = extractTopTerms((sampleChunks || []).map(c => c.text));

    return Response.json({
      total_docs: totalDocs,
      total_chunks: totalChunks || 0,
      year_distribution: yearDistribution,
      top_terms: topTerms,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
