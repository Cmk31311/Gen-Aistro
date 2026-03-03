import { createServerClient } from '../../../lib/supabase';

export async function GET(req) {
  try {
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

    const { data, error } = await supabase
      .from('datasets')
      .select('id, name, description, status, total_chunks, processed_chunks, column_mapping, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ datasets: data });
  } catch (error) {
    console.error('Datasets GET error:', error);
    return Response.json({ error: 'Failed to fetch datasets' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
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

    const { name, description, column_mapping, total_chunks } = await req.json();

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Dataset name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        column_mapping,
        total_chunks: total_chunks || 0,
        status: 'processing',
      })
      .select('id')
      .single();

    if (error) throw error;

    return Response.json({ id: data.id });
  } catch (error) {
    console.error('Datasets POST error:', error);
    return Response.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
