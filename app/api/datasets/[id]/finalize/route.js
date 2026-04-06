import { createServerClient } from '../../../../../lib/supabase-server';

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
    const { data: dataset, error: dsError } = await supabase
      .from('datasets')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (dsError || !dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }
    if (dataset.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count actual chunks stored
    const { count } = await supabase
      .from('chunks')
      .select('id', { count: 'exact', head: true })
      .eq('dataset_id', id);

    // Mark as ready
    const { error: updateError } = await supabase
      .from('datasets')
      .update({
        status: 'ready',
        total_chunks: count || 0,
        processed_chunks: count || 0,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return Response.json({ status: 'ready', total_chunks: count || 0 });
  } catch (error) {
    console.error('Finalize error:', error);
    return Response.json({ error: 'Failed to finalize dataset' }, { status: 500 });
  }
}
