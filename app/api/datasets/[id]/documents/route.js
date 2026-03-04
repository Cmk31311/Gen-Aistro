import { createServerClient } from '../../../../../lib/supabase';

export async function POST(req, { params }) {
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

    const { page = 1, limit = 20, search = '' } = await req.json();
    const offset = (page - 1) * limit;

    // Build query for chunks grouped by doc
    let query = supabase
      .from('chunks')
      .select('doc_id, doc_title, year, url, text, chunk_index')
      .eq('dataset_id', id)
      .order('doc_id', { ascending: true })
      .order('chunk_index', { ascending: true });

    if (search.trim()) {
      query = query.or(`doc_title.ilike.%${search.trim()}%,text.ilike.%${search.trim()}%`);
    }

    const { data: allChunks, error: fetchError } = await query.limit(5000);

    if (fetchError) throw fetchError;

    // Group by doc_id
    const docMap = new Map();
    for (const chunk of (allChunks || [])) {
      const key = chunk.doc_id || chunk.doc_title || `chunk_${chunk.chunk_index}`;
      if (!docMap.has(key)) {
        docMap.set(key, {
          doc_id: chunk.doc_id,
          doc_title: chunk.doc_title,
          year: chunk.year,
          url: chunk.url,
          chunk_count: 0,
          preview: '',
        });
      }
      const doc = docMap.get(key);
      doc.chunk_count++;
      if (!doc.preview && chunk.text) {
        doc.preview = chunk.text.slice(0, 200);
      }
    }

    const documents = Array.from(docMap.values());
    const total = documents.length;
    const paginated = documents.slice(offset, offset + limit);

    return Response.json({
      documents: paginated,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Documents error:', error);
    return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// GET endpoint to fetch full text of a specific document
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

    const { data: dataset } = await supabase
      .from('datasets')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!dataset || dataset.user_id !== user.id) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const docId = url.searchParams.get('doc_id');

    if (!docId) {
      return Response.json({ error: 'doc_id is required' }, { status: 400 });
    }

    const { data: chunks } = await supabase
      .from('chunks')
      .select('doc_id, doc_title, year, url, text, chunk_index')
      .eq('dataset_id', id)
      .eq('doc_id', docId)
      .order('chunk_index', { ascending: true });

    return Response.json({ chunks: chunks || [] });
  } catch (error) {
    console.error('Document detail error:', error);
    return Response.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
