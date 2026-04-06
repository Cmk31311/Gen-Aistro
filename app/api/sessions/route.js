import { createServerClient } from '../../../lib/supabase-server';

function getUser(req, supabase) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return supabase.auth.getUser(token).then(({ data }) => data.user);
}

// GET /api/sessions — list all sessions for the user
export async function GET(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('sessions')
      .select('id, name, dataset_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return Response.json({ sessions: data || [] });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return Response.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

// POST /api/sessions — create or update a session
export async function POST(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, messages, dataset_id } = await req.json();

    if (!name || !messages) {
      return Response.json({ error: 'name and messages are required' }, { status: 400 });
    }

    if (id) {
      // Update existing session
      const { data, error } = await supabase
        .from('sessions')
        .update({ name, messages, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id')
        .single();

      if (error) throw error;
      return Response.json({ id: data.id });
    } else {
      // Create new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, name, messages, dataset_id: dataset_id || null })
        .select('id')
        .single();

      if (error) throw error;
      return Response.json({ id: data.id });
    }
  } catch (err) {
    console.error('Sessions POST error:', err);
    return Response.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

// DELETE /api/sessions?id=xxx — delete a session
export async function DELETE(req) {
  try {
    const supabase = createServerClient();
    const user = await getUser(req, supabase);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error('Sessions DELETE error:', err);
    return Response.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

// GET /api/sessions/:id — get a single session with full messages
export async function HEAD() {
  return new Response(null, { status: 200 });
}
