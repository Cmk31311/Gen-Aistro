import { createServerClient } from '../../../lib/supabase-server';

async function getUser(req, supabase) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

// GET /api/annotations?paper_id=xxx
export async function GET(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get('paper_id');
    if (!paperId) return Response.json({ error: 'paper_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('annotations')
      .select('id, highlighted_text, note, created_at')
      .eq('user_id', user.id)
      .eq('paper_id', paperId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ annotations: data || [] });
  } catch (err) {
    console.error('Annotations GET error:', err);
    return Response.json({ error: 'Failed to load annotations' }, { status: 500 });
  }
}

// POST /api/annotations
export async function POST(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paper_id, highlighted_text, note } = await req.json();
    if (!paper_id) return Response.json({ error: 'paper_id required' }, { status: 400 });
    if (!highlighted_text && !note) return Response.json({ error: 'highlighted_text or note required' }, { status: 400 });

    const { data, error } = await supabase
      .from('annotations')
      .insert({ user_id: user.id, paper_id, highlighted_text: highlighted_text || null, note: note || null })
      .select('id, highlighted_text, note, created_at')
      .single();

    if (error) throw error;
    return Response.json({ annotation: data });
  } catch (err) {
    console.error('Annotations POST error:', err);
    return Response.json({ error: 'Failed to save annotation' }, { status: 500 });
  }
}

// DELETE /api/annotations?id=xxx
export async function DELETE(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error('Annotations DELETE error:', err);
    return Response.json({ error: 'Failed to delete annotation' }, { status: 500 });
  }
}
